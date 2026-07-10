import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { PILLAR_ORDER, todayInTz, addDays, rollingWindowDates, getEffectiveChallengeDay } from '@/lib/constants'
import { evaluateRollingWindow } from '@/lib/rolling-window'
import {
  evaluatePendingDays,
  reevaluateYesterday,
  updateHistoricalSummary,
  computePillarStreaks,
  applyLiveGraceEarn,
} from '@/lib/streaks'
import type {
  GoalCompletions,
  GoalCommitApiResponse,
  PillarDailyEntry,
  PillarLevel,
  PillarName,
  LevelNumber,
  PulseState,
  StreakState,
} from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

// v4 per-goal commit body.
interface CheckinRequestBody {
  pillar: unknown
  challengeId: unknown
  goalId?: unknown
  goalType?: unknown
  done?: unknown
  entry_date?: unknown
}

interface ChallengeCheck {
  is_paused:        boolean
  status:           string
  duration_days:    number
  start_date:       string
  paused_at:        string | null
  pause_days_used:  number
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tz = request.cookies.get('tz')?.value
  const clientToday = todayInTz(tz)

  let body: CheckinRequestBody
  try {
    body = (await request.json()) as CheckinRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { pillar, challengeId, entry_date } = body

  // Validate optional entry_date
  if (entry_date !== undefined && (typeof entry_date !== 'string' || !ISO_DATE_RE.test(entry_date))) {
    return NextResponse.json({ error: 'Invalid entry_date' }, { status: 400 })
  }
  const effectiveDate: string = (typeof entry_date === 'string' ? entry_date : null) ?? clientToday

  // Validate pillar
  if (typeof pillar !== 'string' || !PILLAR_ORDER.includes(pillar as PillarName)) {
    return NextResponse.json({ error: 'Invalid pillar' }, { status: 400 })
  }

  // Validate challengeId
  if (typeof challengeId !== 'string' || challengeId.trim() === '') {
    return NextResponse.json({ error: 'Invalid challengeId' }, { status: 400 })
  }

  const typedPillar = pillar as PillarName

  const supabase = createServerSupabaseClient()

  // Guard: verify challenge belongs to this user AND is not paused.
  // Filtering on both id and user_id prevents one authenticated user from
  // writing entries into another user's challenge.
  const { data: challengeCheck, error: challengeCheckError } = await supabase
    .from('challenges')
    .select('is_paused, status, duration_days, start_date, paused_at, pause_days_used')
    .eq('id', challengeId)
    .eq('user_id', userId)
    .single<ChallengeCheck>()

  if (challengeCheckError || !challengeCheck) {
    if (challengeCheckError) {
      console.error('checkin: failed to verify challenge state:', challengeCheckError)
    }
    return NextResponse.json({ error: 'Challenge not found' }, { status: 403 })
  }

  if (challengeCheck.is_paused) {
    return NextResponse.json({ error: 'Challenge is paused' }, { status: 403 })
  }

  // Block today saves once the challenge duration has elapsed — the user must
  // explicitly extend or end before more check-ins are accepted.
  // Retroactive saves (past entry_date) remain allowed.
  if (effectiveDate === clientToday) {
    const effectiveDay = getEffectiveChallengeDay(challengeCheck, clientToday)
    if (effectiveDay > challengeCheck.duration_days) {
      return NextResponse.json(
        { error: 'Challenge duration ended — extend or complete to continue' },
        { status: 403 }
      )
    }
  }

  return handleGoalCommit(
    userId, tz, clientToday, effectiveDate, typedPillar, challengeId, body, supabase
  )
}


// =============================================================================
// v4 per-goal commit
// =============================================================================

async function handleGoalCommit(
  userId: string,
  tz: string | undefined,
  clientToday: string,
  effectiveDate: string,
  pillar: PillarName,
  challengeId: string,
  body: CheckinRequestBody,
  supabase: SupabaseClient
) {
  const { goalId, goalType, done } = body

  if (typeof goalId !== 'string' || goalId.trim() === '') {
    return NextResponse.json({ error: 'Invalid goalId' }, { status: 400 })
  }
  if (goalType !== 'duration' && goalType !== 'destination') {
    return NextResponse.json({ error: 'Invalid goalType' }, { status: 400 })
  }
  if (typeof done !== 'boolean') {
    return NextResponse.json({ error: 'Invalid done' }, { status: 400 })
  }

  // Verify the goal belongs to this user, matches the pillar, and is active —
  // ownership checked in the same query as the id (house rule).
  if (goalType === 'duration') {
    const { data: goal } = await supabase
      .from('duration_goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', userId)
      .eq('pillar', pillar)
      .eq('is_active', true)
      .maybeSingle<{ id: string }>()
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 403 })
  } else {
    const { data: goal } = await supabase
      .from('destination_goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', userId)
      .eq('pillar', pillar)
      .eq('status', 'active')
      .maybeSingle<{ id: string }>()
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 403 })
  }

  // Fold any pending days into streak state before reasoning about
  // yesterday/today. Fast path is a single SELECT.
  const evalResult = await evaluatePendingDays(userId, tz, supabase)
  let streakState: StreakState = evalResult.state

  // Atomic merge of this one goal into the entry's jsonb map + completed
  // recompute — two racing commits both land (in-row || concatenation).
  const { data: mergeData, error: mergeError } = await supabase.rpc('checkin_merge_goal', {
    p_user_id:      userId,
    p_challenge_id: challengeId,
    p_pillar:       pillar,
    p_entry_date:   effectiveDate,
    p_goal_id:      goalId,
    p_done:         done,
  })

  if (mergeError) {
    console.error('checkin: checkin_merge_goal failed:', mergeError)
    return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 })
  }

  const merge = mergeData as { goal_completions: GoalCompletions; completed: boolean; was_completed: boolean } | null
  if (!merge || typeof merge.completed !== 'boolean') {
    console.error('checkin: unexpected checkin_merge_goal result:', mergeData)
    return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 })
  }

  const completed = merge.completed
  const pillarCompleted = completed && !merge.was_completed
  const yesterday = addDays(clientToday, -1)

  // ── Older than yesterday: history-only. Update the day's summary counts;
  //    never touches streak_state (a broken streak is never resurrected).
  if (effectiveDate < yesterday) {
    await updateHistoricalSummary(userId, effectiveDate, supabase)
    return NextResponse.json(buildResponse({
      completed, pillarCompleted, advanced: false, newLevel: null,
      pillarStreak: 0, daySealed: false,
      mainStreak: streakState.main_streak, graceBank: streakState.grace_bank, graceEarned: false,
    }))
  }

  // ── Yesterday: inside the editable streak window until midnight tonight.
  //    Re-classify it — refunds provisionally-consumed grace, resurrects a
  //    streak broken only by yesterday. No advancement/pulse/groups (existing rule).
  if (effectiveDate === yesterday) {
    const updated = await reevaluateYesterday(userId, tz, supabase)
    if (updated) streakState = updated
    const pillarStreaks = await computePillarStreaks(userId, [pillar], yesterday, supabase)
    return NextResponse.json(buildResponse({
      completed, pillarCompleted, advanced: false, newLevel: null,
      pillarStreak: pillarStreaks[pillar], daySealed: false,
      mainStreak: streakState.main_streak, graceBank: streakState.grace_bank, graceEarned: false,
    }))
  }

  // ── Today: full side-effects.
  await syncGroupDailyStatus(userId, effectiveDate, supabase)
  await updatePulseState(userId, challengeId, supabase, clientToday)

  // Advancement — only when this commit completed the pillar
  let advanced = false
  let newLevel: LevelNumber | null = null
  if (pillarCompleted && goalType === 'duration') {
    const advancement = await runAdvancement(userId, pillar, clientToday, supabase)
    advanced = advancement.advanced
    newLevel = advancement.newLevel
  }

  // Day sealed? Every required pillar (active + >= 1 active duration goal)
  // has a completed entry for today.
  let daySealed = false
  if (completed) {
    daySealed = await isDaySealed(userId, clientToday, supabase)
  }

  let graceBank = streakState.grace_bank
  let graceEarned = false
  if (daySealed && pillarCompleted) {
    // Today's seal pushes the display streak; bank a grace day immediately
    // when it lands on an earn multiple (idempotent vs tomorrow's evaluator).
    graceEarned = await applyLiveGraceEarn(userId, streakState.main_streak + 1, supabase)
    if (graceEarned) graceBank = Math.min(graceBank + 1, 2)
  }

  const pillarStreaks = await computePillarStreaks(userId, [pillar], yesterday, supabase)

  return NextResponse.json(buildResponse({
    completed,
    pillarCompleted,
    advanced,
    newLevel,
    pillarStreak: pillarStreaks[pillar] + (completed ? 1 : 0),
    daySealed,
    mainStreak: streakState.main_streak + (daySealed ? 1 : 0),
    graceBank,
    graceEarned,
  }))
}

function buildResponse(fields: Omit<GoalCommitApiResponse, 'success'>): GoalCommitApiResponse {
  return { success: true, ...fields }
}

// Every required pillar has a completed entry on `date`
async function isDaySealed(
  userId: string,
  date: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const [levelsResult, goalsResult, entriesResult] = await Promise.all([
    supabase
      .from('pillar_levels')
      .select('pillar')
      .eq('user_id', userId)
      .eq('is_active', true)
      .returns<{ pillar: PillarName }[]>(),
    supabase
      .from('duration_goals')
      .select('pillar')
      .eq('user_id', userId)
      .eq('is_active', true)
      .returns<{ pillar: PillarName }[]>(),
    supabase
      .from('pillar_daily_entries')
      .select('pillar')
      .eq('user_id', userId)
      .eq('entry_date', date)
      .eq('completed', true)
      .returns<{ pillar: PillarName }[]>(),
  ])

  const goalPillars = new Set((goalsResult.data ?? []).map((g) => g.pillar))
  const required = (levelsResult.data ?? []).map((l) => l.pillar).filter((p) => goalPillars.has(p))
  if (required.length === 0) return false

  const completedSet = new Set((entriesResult.data ?? []).map((e) => e.pillar))
  return required.every((p) => completedSet.has(p))
}

// Rolling-window advancement — unchanged v3 logic, shared by both paths
async function runAdvancement(
  userId: string,
  pillar: PillarName,
  clientToday: string,
  supabase: SupabaseClient
): Promise<{ advanced: boolean; newLevel: LevelNumber | null }> {
  const windowStart = rollingWindowDates(60, clientToday)[0]

  const [levelResult, entriesResult] = await Promise.all([
    supabase
      .from('pillar_levels')
      .select('level')
      .eq('user_id', userId)
      .eq('pillar', pillar)
      .single<Pick<PillarLevel, 'level'>>(),

    supabase
      .from('pillar_daily_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('pillar', pillar)
      .gte('entry_date', windowStart)
      .lte('entry_date', clientToday)
      .returns<PillarDailyEntry[]>(),
  ])

  if (levelResult.error) {
    console.error('checkin: failed to load pillar_levels for advancement check:', levelResult.error)
    return { advanced: false, newLevel: null }
  }

  const currentLevel = levelResult.data.level as LevelNumber
  const entries = entriesResult.data ?? []

  const result = evaluateRollingWindow(entries, currentLevel, pillar, clientToday)

  if (!result.shouldAdvance || result.nextLevel === null) {
    return { advanced: false, newLevel: null }
  }

  const { error: advanceError } = await supabase
    .from('pillar_levels')
    .update({ level: result.nextLevel })
    .eq('user_id', userId)
    .eq('pillar', pillar)

  if (advanceError) {
    console.error('checkin: failed to advance pillar level:', advanceError)
    return { advanced: false, newLevel: null }
  }

  return { advanced: true, newLevel: result.nextLevel }
}


// ---------------------------------------------------------------------------
// syncGroupDailyStatus
// Called after every today save. Finds all active groups this user belongs to
// and upserts a completed = true row in group_daily_status for each (binary
// green-circle indicator — any pillar activity today counts).
// Non-fatal — errors are logged only.
// ---------------------------------------------------------------------------
async function syncGroupDailyStatus(
  userId: string,
  today: string,
  supabase: SupabaseClient,
): Promise<void> {
  const { data: memberships, error: membershipError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .returns<{ group_id: string }[]>()

  if (membershipError || !memberships || memberships.length === 0) {
    if (membershipError) {
      console.error('checkin: group status sync — failed to fetch memberships:', membershipError)
    }
    return
  }

  const groupIds = memberships.map((m) => m.group_id)

  const { data: activeGroups, error: groupsError } = await supabase
    .from('consistency_groups')
    .select('id')
    .in('id', groupIds)
    .eq('status', 'active')
    .returns<{ id: string }[]>()

  if (groupsError || !activeGroups || activeGroups.length === 0) {
    if (groupsError) {
      console.error('checkin: group status sync — failed to fetch active groups:', groupsError)
    }
    return
  }

  const rows = activeGroups.map((g) => ({
    group_id:    g.id,
    user_id:     userId,
    status_date: today,
    completed:   true,
  }))

  const { error: upsertError } = await supabase
    .from('group_daily_status')
    .upsert(rows, { onConflict: 'group_id,user_id,status_date' })

  if (upsertError) {
    console.error('checkin: group status sync — failed to upsert group_daily_status:', upsertError)
  }
}

// ---------------------------------------------------------------------------
// updatePulseState
// Called after every today save (completed or not).
// Looks at last 7 days of entries across all pillars and sets pulse_state:
//   ≥5 completed days → 'smooth_sailing'
//   ≥3 completed days → 'rough_waters'
//   else              → 'taking_on_water'
// Non-fatal — errors are logged only.
// ---------------------------------------------------------------------------
async function updatePulseState(
  userId: string,
  challengeId: string,
  supabase: SupabaseClient,
  today: string,
): Promise<void> {
  const sevenDaysAgo = rollingWindowDates(7, today)[0]

  const { data: recentEntries, error: entriesError } = await supabase
    .from('pillar_daily_entries')
    .select('entry_date, completed')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .gte('entry_date', sevenDaysAgo)
    .lte('entry_date', today)
    .returns<{ entry_date: string; completed: boolean }[]>()

  if (entriesError) {
    console.error('checkin: updatePulseState — failed to fetch recent entries:', entriesError)
    return
  }

  const completedDays = new Set(
    (recentEntries ?? []).filter((e) => e.completed).map((e) => e.entry_date)
  ).size

  let newPulse: PulseState
  if (completedDays >= 5) newPulse = 'smooth_sailing'
  else if (completedDays >= 3) newPulse = 'rough_waters'
  else newPulse = 'taking_on_water'

  const { error: updateError } = await supabase
    .from('challenges')
    .update({ pulse_state: newPulse, pulse_updated_at: new Date().toISOString() })
    .eq('id', challengeId)

  if (updateError) {
    console.error('checkin: updatePulseState — failed to update pulse_state:', updateError)
  }
}
