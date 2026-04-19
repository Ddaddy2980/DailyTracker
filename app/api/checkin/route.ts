import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { PILLAR_ORDER, todayStr, rollingWindowDates } from '@/lib/constants'
import { evaluateRollingWindow } from '@/lib/rolling-window'
import type { DurationGoal, GoalCompletions, PillarDailyEntry, PillarLevel, LevelNumber, PulseState } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

interface CheckinRequestBody {
  pillar: unknown
  challengeId: unknown
  goalCompletions: unknown
  entry_date?: unknown
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CheckinRequestBody
  try {
    body = (await request.json()) as CheckinRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { pillar, challengeId, goalCompletions, entry_date } = body

  // Validate optional entry_date
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  if (entry_date !== undefined && (typeof entry_date !== 'string' || !ISO_DATE_RE.test(entry_date))) {
    return NextResponse.json({ error: 'Invalid entry_date' }, { status: 400 })
  }
  const effectiveDate: string = (typeof entry_date === 'string' ? entry_date : null) ?? todayStr()

  // Validate pillar
  if (typeof pillar !== 'string' || !PILLAR_ORDER.includes(pillar as (typeof PILLAR_ORDER)[number])) {
    return NextResponse.json({ error: 'Invalid pillar' }, { status: 400 })
  }

  // Validate challengeId
  if (typeof challengeId !== 'string' || challengeId.trim() === '') {
    return NextResponse.json({ error: 'Invalid challengeId' }, { status: 400 })
  }

  // Validate goalCompletions is a Record<string, boolean>
  if (
    typeof goalCompletions !== 'object' ||
    goalCompletions === null ||
    Array.isArray(goalCompletions)
  ) {
    return NextResponse.json({ error: 'Invalid goalCompletions' }, { status: 400 })
  }

  for (const [key, val] of Object.entries(goalCompletions)) {
    if (typeof key !== 'string' || typeof val !== 'boolean') {
      return NextResponse.json({ error: 'Invalid goalCompletions shape' }, { status: 400 })
    }
  }

  const typedGoalCompletions = goalCompletions as GoalCompletions
  const typedPillar = pillar as (typeof PILLAR_ORDER)[number]

  const supabase = createServerSupabaseClient()

  // Guard: reject saves when the challenge is paused
  const { data: challengeCheck, error: challengeCheckError } = await supabase
    .from('challenges')
    .select('is_paused')
    .eq('id', challengeId as string)
    .single<{ is_paused: boolean }>()

  if (challengeCheckError) {
    console.error('checkin: failed to verify challenge pause state:', challengeCheckError)
    return NextResponse.json({ error: 'Failed to verify challenge state' }, { status: 500 })
  }

  if (challengeCheck?.is_paused) {
    return NextResponse.json({ error: 'Challenge is paused' }, { status: 403 })
  }

  // Fetch active duration goals for this user+pillar to determine `completed`
  const { data: activeGoals, error: goalsError } = await supabase
    .from('duration_goals')
    .select('id')
    .eq('user_id', userId)
    .eq('pillar', typedPillar)
    .eq('is_active', true)
    .returns<Pick<DurationGoal, 'id'>[]>()

  if (goalsError) {
    console.error('checkin: failed to load active duration_goals:', goalsError)
    return NextResponse.json({ error: 'Failed to load goals' }, { status: 500 })
  }

  const goals = activeGoals ?? []

  // completed = true only when every active duration goal is checked
  const completed =
    goals.length > 0 &&
    goals.every((g) => typedGoalCompletions[g.id] === true)

  const { error: upsertError } = await supabase
    .from('pillar_daily_entries')
    .upsert(
      {
        user_id:          userId,
        challenge_id:     challengeId,
        pillar:           typedPillar,
        entry_date:       effectiveDate,
        completed,
        goal_completions: typedGoalCompletions,
      },
      { onConflict: 'user_id,pillar,entry_date' }
    )

  if (upsertError) {
    console.error('checkin: failed to upsert pillar_daily_entry:', upsertError)
    return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 })
  }

  // Only evaluate advancement and sync group status for today's completions.
  // Retroactive edits to past days do not trigger level-up or group sync.
  if (effectiveDate !== todayStr()) {
    return NextResponse.json({ success: true, completed, advanced: false, newLevel: null })
  }

  // Non-blocking side-effects for today saves
  void syncGroupDailyStatus(userId, effectiveDate)
  void updatePulseState(userId, challengeId as string, supabase)

  if (!completed) {
    return NextResponse.json({ success: true, completed, advanced: false, newLevel: null })
  }

  // Fetch current pillar level and last 60 days of entries in parallel.
  // 60 days covers the largest rolling window (Grooving → Soloing).
  // evaluateRollingWindow filters internally to the correct window for the level.
  const windowStart = rollingWindowDates(60)[0]

  const [levelResult, entriesResult] = await Promise.all([
    supabase
      .from('pillar_levels')
      .select('level')
      .eq('user_id', userId)
      .eq('pillar', typedPillar)
      .single<Pick<PillarLevel, 'level'>>(),

    supabase
      .from('pillar_daily_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('pillar', typedPillar)
      .gte('entry_date', windowStart)
      .lte('entry_date', todayStr())
      .returns<PillarDailyEntry[]>(),
  ])

  if (levelResult.error) {
    console.error('checkin: failed to load pillar_levels for advancement check:', levelResult.error)
    // Non-fatal — entry was already saved; return success without advancement
    return NextResponse.json({ success: true, completed, advanced: false, newLevel: null })
  }

  const currentLevel = levelResult.data.level as LevelNumber
  const entries = entriesResult.data ?? []

  const result = evaluateRollingWindow(entries, currentLevel, typedPillar)

  if (!result.shouldAdvance || result.nextLevel === null) {
    return NextResponse.json({ success: true, completed, advanced: false, newLevel: null })
  }

  // Advance the pillar level
  const { error: advanceError } = await supabase
    .from('pillar_levels')
    .update({ level: result.nextLevel })
    .eq('user_id', userId)
    .eq('pillar', typedPillar)

  if (advanceError) {
    console.error('checkin: failed to advance pillar level:', advanceError)
    // Non-fatal — entry was saved; report no advancement rather than erroring
    return NextResponse.json({ success: true, completed, advanced: false, newLevel: null })
  }

  return NextResponse.json({
    success:   true,
    completed,
    advanced:  true,
    newLevel:  result.nextLevel,
  })
}

// ---------------------------------------------------------------------------
// syncGroupDailyStatus
// Called after a successful today's pillar save when completed = true.
// Finds all active groups this user belongs to and upserts a completed = true
// row in group_daily_status for each. Non-fatal — errors are logged only.
// ---------------------------------------------------------------------------
async function syncGroupDailyStatus(userId: string, today: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  // Get all active group memberships for this user where the group is active
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

  // Only sync to groups with status = 'active' (not paused/archived)
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
): Promise<void> {
  const sevenDaysAgo = rollingWindowDates(7)[0]

  const { data: recentEntries, error: entriesError } = await supabase
    .from('pillar_daily_entries')
    .select('entry_date, completed')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .gte('entry_date', sevenDaysAgo)
    .lte('entry_date', todayStr())
    .returns<{ entry_date: string; completed: boolean }[]>()

  if (entriesError) {
    console.error('checkin: updatePulseState — failed to fetch recent entries:', entriesError)
    return
  }

  // Count distinct days that had at least one completed pillar
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
