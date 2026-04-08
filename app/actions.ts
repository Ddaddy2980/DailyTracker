'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'
import {
  defaultGoals,
  todayStr,
  type UserConfig,
  type UserGoals,
  type DailyEntry,
  type PillarGoal,
} from '@/lib/constants'
import type {
  UserProfile, Challenge, ChallengeEntry, Reward, RewardType,
  PulseState, PulseTrigger, PendingPulseCheck, PulseCheck,
  DestinationGoal, FocusTop5Item, WeeklyReflection,
  DestinationGoalCheckInStatus, CompletionStatus, GroupDailyFlags,
  ChallengePause, PendingJourneyEvent,
  PillarName, PillarLevel, DurationGoalDestination,
} from '@/lib/types'
import { resolveOperatingState } from '@/lib/pillar-state'
import { checkRootedMilestone } from '@/lib/milestones'
import {
  resolveNextPillarInvitation,
  meetsRollingWindowThreshold,
  INVITATION_THRESHOLDS,
} from '@/lib/next-pillar-invitation'
import { type GaugeEntryRow } from '@/lib/gauge-engine'
import {
  calculateCurrentDay,
  calculateJourneyPreview,
  getLevelForDay,
  evaluateTuningCompletion,
  evaluateJammingPhase1,
} from '@/lib/journeyEngine'

// Merge stored pillar goals with defaults so every expected ID is always present.
// Guards against empty arrays (migration default) or goals added after initial setup.
function mergePillarGoals(stored: PillarGoal[] | null | undefined, defaults: PillarGoal[]): PillarGoal[] {
  if (!stored || !Array.isArray(stored) || stored.length === 0) return defaults
  return defaults.map(def => {
    const saved = stored.find((g: PillarGoal) => g.id === def.id)
    return saved ? { ...def, ...saved } : def   // spread def first so new fields get defaults
  })
}

// ─── User profile (v2) ────────────────────────────────────────────────────────

export async function getUserProfile(): Promise<UserProfile | null> {
  const { userId } = await auth()
  if (!userId) return null

  const sb = createServerSupabaseClient()

  // Try to fetch existing profile
  const { data: existing, error: fetchError } = await sb
    .from('user_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) {
    console.error('getUserProfile fetch:', fetchError)
    return null
  }

  if (existing) return existing as UserProfile

  // No profile found — create one with Level 1 defaults
  const { data: created, error: insertError } = await sb
    .from('user_profile')
    .insert({
      user_id:              userId,
      current_level:        1,
      onboarding_completed: false,
      selected_pillars:     [],
    })
    .select()
    .single()

  if (insertError) {
    console.error('getUserProfile insert:', insertError)
    return null
  }

  return created as UserProfile
}

// ─── Challenge (v2) ───────────────────────────────────────────────────────────

// Maps pillar name to the daily_entries column that stores its completion state
const PILLAR_COL: Record<string, string> = {
  spiritual:   'spiritual',
  physical:    'physical_goals',
  nutritional: 'nutritional',
  personal:    'personal',
  missional:   'missional',
}

export async function getActiveChallenge(): Promise<Challenge | null> {
  const { userId } = await auth()
  if (!userId) return null

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('challenges')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) { console.error('getActiveChallenge:', error); return null }
  return data as Challenge | null
}

export async function getChallengeEntries(
  startDate: string,
  endDate:   string,
): Promise<ChallengeEntry[]> {
  const { userId } = await auth()
  if (!userId) return []

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('daily_entries')
    .select('entry_date, spiritual, physical_goals, nutritional, personal')
    .eq('user_id', userId)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .order('entry_date', { ascending: true })

  if (error) { console.error('getChallengeEntries:', error); return [] }
  return (data ?? []).map(row => ({
    entry_date:    row.entry_date,
    spiritual:     (row.spiritual      ?? {}) as Record<string, unknown>,
    physical_goals:(row.physical_goals ?? {}) as Record<string, unknown>,
    nutritional:   (row.nutritional    ?? {}) as Record<string, unknown>,
    personal:      (row.personal       ?? {}) as Record<string, unknown>,
  }))
}

// ── Group daily status helpers ─────────────────────────────────────────────────
// Used only by updateGroupDailyStatus below.  Not exported.

/**
 * A DB column value is "engaged" when the user has written any data to it —
 * regardless of whether goals were completed.  null, {}, and [] all count as
 * not engaged.  Everything else counts as engaged.
 */
function isEngaged(val: unknown): boolean {
  if (val === null || val === undefined) return false
  if (Array.isArray(val))               return val.length > 0
  if (typeof val === 'object')          return Object.keys(val as object).length > 0
  return false
}

/**
 * Returns true if the user touched any data in the given pillar's columns
 * in today's daily_entries row.
 *
 * Column mapping (matches PILLAR_COL + additional engagement columns):
 *   spiritual   → spiritual
 *   physical    → physical_goals OR activities
 *   nutritional → nutritional OR nutritional_log
 *   personal    → personal
 */
function isPillarEngaged(pillar: string, entry: Record<string, unknown>): boolean {
  switch (pillar) {
    case 'spiritual':
      return isEngaged(entry.spiritual)
    case 'physical':
      return isEngaged(entry.physical_goals) || isEngaged(entry.activities)
    case 'nutritional':
      return isEngaged(entry.nutritional) || isEngaged(entry.nutritional_log)
    case 'personal':
      return isEngaged(entry.personal)
    default:
      return false
  }
}

/**
 * Writes (or updates) group_daily_status rows for every active group the user
 * belongs to.  Called fire-and-forget from submitCheckin — errors are caught
 * and logged silently so a failure here can never cause a check-in to fail.
 *
 * No-downgrade rule: if the existing row already has completion_status='full'
 * the upsert will not reduce it to 'partial' or 'none' within the same day.
 */
async function updateGroupDailyStatus(userId: string, entryDate: string): Promise<void> {
  try {
    const sb = createServerSupabaseClient()

    // 1. Active group memberships — exit early if none
    const { data: memberRows, error: memberErr } = await sb
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .eq('active', true)

    if (memberErr) { console.error('updateGroupDailyStatus members:', memberErr); return }
    const groupIds = (memberRows ?? []).map(r => r.group_id as string)
    if (groupIds.length === 0) return

    // 2 + 3: Today's entry and active challenge in parallel — exit if either missing
    const [entryRes, challengeRes] = await Promise.all([
      sb
        .from('daily_entries')
        .select('spiritual, physical_goals, activities, nutritional, nutritional_log, personal')
        .eq('user_id', userId)
        .eq('entry_date', entryDate)
        .maybeSingle(),
      sb
        .from('challenges')
        .select('start_date, pillar_goals')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (!entryRes.data || !challengeRes.data) return

    const entry         = entryRes.data as Record<string, unknown>
    const activePillars = Object.keys(challengeRes.data.pillar_goals as Record<string, unknown>)
    const startDate     = challengeRes.data.start_date as string

    // 4. Engagement-based completion_status
    const engagedCount = activePillars.filter(p => isPillarEngaged(p, entry)).length
    const completionStatus: CompletionStatus =
      engagedCount === activePillars.length ? 'full'
      : engagedCount > 0                    ? 'partial'
      :                                       'none'

    // 5. Streak + existing status rows in parallel
    //    Streak: walk backwards through entries, count consecutive complete days.
    //    Existing rows: needed for the no-downgrade rule.
    const [entriesRes, existingRes] = await Promise.all([
      sb
        .from('daily_entries')
        .select('entry_date, spiritual, physical_goals, nutritional, personal')
        .eq('user_id', userId)
        .gte('entry_date', startDate)
        .lte('entry_date', entryDate)
        .order('entry_date', { ascending: false }),
      sb
        .from('group_daily_status')
        .select('group_id, completion_status')
        .in('group_id', groupIds)
        .eq('user_id', userId)
        .eq('status_date', entryDate),
    ])

    // Count consecutive complete days from today backwards
    let streak = 0
    for (const e of entriesRes.data ?? []) {
      const row = e as Record<string, unknown>
      const isComplete = activePillars.every(p => {
        const col = PILLAR_COL[p]
        const val = col ? row[col] as Record<string, unknown> | null : null
        return val?.challenge_complete === true
      })
      if (isComplete) streak++
      else break
    }

    // Map group_id → existing status for the no-downgrade check
    const existingMap = new Map<string, CompletionStatus>(
      (existingRes.data ?? []).map(r => [
        r.group_id as string,
        r.completion_status as CompletionStatus,
      ])
    )

    const now = new Date().toISOString()

    // 6. Upsert all groups in parallel
    //    No-downgrade: if either the existing row OR the new calculation is 'full',
    //    the stored value stays 'full'.  This is enforced in JS before the upsert so
    //    a re-check-in with partial completion never removes a user's green checkmark.
    await Promise.all(
      groupIds.map(groupId => {
        const existing    = existingMap.get(groupId)
        const finalStatus: CompletionStatus =
          existing === 'full' || completionStatus === 'full' ? 'full' : completionStatus

        return sb.from('group_daily_status').upsert(
          {
            group_id:          groupId,
            user_id:           userId,
            status_date:       entryDate,
            completion_status: finalStatus,
            streak_count:      streak,
            active_pillars:    activePillars,
            updated_at:        now,
          },
          // onConflict references the three columns that form the
          // group_daily_status_unique_day constraint — re-check-in updates, not inserts.
          { onConflict: 'group_id,user_id,status_date' },
        )
      })
    )

    // 7. Full-group-day check (Step 16g)
    //    For each group just upserted, check whether every active member now has
    //    completion_status='full' for today.  If so, write a group_daily_flags flag
    //    to consistency_groups so GroupCard can render the celebratory banner.
    //    Only writes when all members are 'full' AND no flag exists for today yet.
    //    Requires ≥2 active members — solo groups don't trigger the celebration.
    await Promise.all(
      groupIds.map(async groupId => {
        // Parallel: active member count + full-status count + existing flag
        const [memberCountRes, fullCountRes, groupFlagRes] = await Promise.all([
          sb
            .from('group_members')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .eq('active', true),
          sb
            .from('group_daily_status')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .eq('status_date', entryDate)
            .eq('completion_status', 'full'),
          sb
            .from('consistency_groups')
            .select('group_daily_flags')
            .eq('id', groupId)
            .maybeSingle(),
        ])

        const memberCount = memberCountRes.count ?? 0
        const fullCount   = fullCountRes.count   ?? 0

        if (memberCount < 2)              return // skip solo groups
        if (fullCount < memberCount)      return // not everyone full yet

        // Don't overwrite an existing flag for today (preserves notified=true)
        const existingFlags = groupFlagRes.data?.group_daily_flags as GroupDailyFlags | null
        if (existingFlags?.date === entryDate) return

        await sb
          .from('consistency_groups')
          .update({ group_daily_flags: { date: entryDate, notified: false } satisfies GroupDailyFlags })
          .eq('id', groupId)
      })
    )
  } catch (err) {
    // Swallow — this function must never cause submitCheckin to fail.
    console.error('updateGroupDailyStatus (silent):', err)
  }
}

// ── Date arithmetic helper ────────────────────────────────────────────────────

function addDaysToDate(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

/**
 * Runs all continuous journey milestone logic after a check-in is saved.
 *
 * Fire-and-forget: called with `void` from submitCheckin, identical to the
 * updateGroupDailyStatus pattern. All errors are caught silently — this
 * function must never block or fail a check-in.
 *
 * Grandfather clause: returns immediately if is_continuous = false.
 *
 * What it does (in order):
 *   1. Fetches the challenge. Returns if legacy (is_continuous = false).
 *   2. Recalculates tuning_days_completed from entries if the saved date
 *      falls within Days 1–7 and the evaluation hasn't fired yet.
 *      (Recalculate > increment: idempotent when the user re-edits a day.)
 *   3. On or after Day 7, if tuning_evaluation_done = false:
 *      runs evaluateTuningCompletion, writes pending_journey_event,
 *      sets tuning_evaluation_done = true. Returns immediately after write.
 *   4. On or after Day 14, if jamming_phase1_completed = false AND
 *      tuning_evaluation_done = true AND pending_journey_event is null:
 *      counts engaged Days 8–14, runs evaluateJammingPhase1, writes
 *      pending_journey_event, sets jamming_phase1_completed = true. Returns.
 *   5. Checks level advancement: advances journey_current_level only when
 *      getLevelForDay(currentDay) > current level AND the relevant evaluation
 *      is done AND pending_journey_event is null (acknowledged by user in UI).
 *   6. Writes all updates to challenges in one DB call.
 *   7. If level advanced, syncs user_profile.current_level.
 */
async function processJourneyMilestones(
  userId:      string,
  challengeId: string,
  entryDate:   string,
): Promise<void> {
  try {
    const sb = createServerSupabaseClient()

    // ── 1. Fetch challenge ────────────────────────────────────────────────
    const { data: raw, error: fetchErr } = await sb
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('user_id', userId)
      .single()

    if (fetchErr || !raw) return
    const challenge = raw as Challenge

    // ── Grandfather clause ────────────────────────────────────────────────
    if (!challenge.is_continuous) return

    // ── 2. Derive context ─────────────────────────────────────────────────
    const currentDay      = calculateCurrentDay(challenge.start_date)
    const selectedPillars = Object.keys(
      challenge.pillar_goals as Record<string, unknown>,
    )

    // Day number of the entry being saved (may differ from currentDay for
    // past-date edits — e.g. user edits Day 3 while currently on Day 10)
    const entryDayNum = Math.max(
      1,
      Math.floor(
        (new Date(entryDate + 'T00:00:00').getTime() -
          new Date(challenge.start_date + 'T00:00:00').getTime()) /
          86_400_000,
      ) + 1,
    )

    // Accumulate all DB updates; written in one pass at the end
    const updates: Record<string, unknown> = {}

    // ── 3. Recalculate tuning_days_completed ──────────────────────────────
    // Only when the saved entry falls in Days 1–7 and evaluation hasn't fired.
    // Recalculate (not increment) so re-saves don't double-count.
    let freshTuningDays = challenge.tuning_days_completed

    if (!challenge.tuning_evaluation_done && entryDayNum >= 1 && entryDayNum <= 7) {
      const day7End = addDaysToDate(challenge.start_date, 6) // Day 7 = start + 6

      const { data: tuningRows } = await sb
        .from('daily_entries')
        .select(
          'spiritual, physical_goals, activities, nutritional, nutritional_log, personal',
        )
        .eq('user_id', userId)
        .gte('entry_date', challenge.start_date)
        .lte('entry_date', day7End)

      freshTuningDays = (tuningRows ?? []).filter(e =>
        selectedPillars.some(p =>
          isPillarEngaged(p, e as Record<string, unknown>),
        ),
      ).length

      if (freshTuningDays !== challenge.tuning_days_completed) {
        updates.tuning_days_completed = freshTuningDays
      }
    }

    // ── 4. Day 7 — Tuning evaluation ──────────────────────────────────────
    // Fires on or after Day 7 (handles missed check-ins on Day 7 itself).
    // Uses freshTuningDays so the evaluation sees the just-recalculated count.
    if (currentDay >= 7 && !challenge.tuning_evaluation_done) {
      const challengeForEval: Challenge = {
        ...challenge,
        tuning_days_completed: freshTuningDays,
      }
      const result = evaluateTuningCompletion(challengeForEval)

      updates.tuning_evaluation_done = true
      updates.pending_journey_event  = {
        type:    'tuning_evaluation',
        outcome: result.outcome,
        message: result.message,
      } satisfies PendingJourneyEvent

      // Write and return — only one pending_journey_event per call.
      // Level advancement cannot happen in the same call as an evaluation write.
      updates.updated_at = new Date().toISOString()
      await sb.from('challenges').update(updates).eq('id', challengeId)
      return
    }

    // ── 5. Day 14 — Jamming Phase 1 evaluation ────────────────────────────
    // Fires on or after Day 14, after tuning has been evaluated AND acknowledged
    // (pending_journey_event = null means the Tuning modal was dismissed).
    if (
      currentDay >= 14 &&
      !challenge.jamming_phase1_completed &&
      challenge.tuning_evaluation_done &&
      challenge.pending_journey_event === null
    ) {
      const day8Start = addDaysToDate(challenge.start_date, 7)   // Day 8  = start + 7
      const day14End  = addDaysToDate(challenge.start_date, 13)  // Day 14 = start + 13

      const { data: jammingRows } = await sb
        .from('daily_entries')
        .select(
          'spiritual, physical_goals, activities, nutritional, nutritional_log, personal',
        )
        .eq('user_id', userId)
        .gte('entry_date', day8Start)
        .lte('entry_date', day14End)

      const jammingDaysCount = (jammingRows ?? []).filter(e =>
        selectedPillars.some(p =>
          isPillarEngaged(p, e as Record<string, unknown>),
        ),
      ).length

      const result = evaluateJammingPhase1(challenge, jammingDaysCount)

      updates.jamming_phase1_completed = true
      updates.pending_journey_event    = {
        type:   'jamming_phase2_offer',
        unlock: result.unlock_phase2,
      } satisfies PendingJourneyEvent

      if (result.unlock_phase2) {
        updates.jamming_phase2_unlocked = true
      }

      // Write and return — same one-event-per-call rule.
      updates.updated_at = new Date().toISOString()
      await sb.from('challenges').update(updates).eq('id', challengeId)
      return
    }

    // ── 6. Level advancement ──────────────────────────────────────────────
    // Advances journey_current_level when:
    //   • getLevelForDay(currentDay) > challenge.journey_current_level
    //   • The evaluation gate for this transition is satisfied
    //   • pending_journey_event IS NULL (user acknowledged the modal)
    //
    // Level 4 (Soloing) only applies when the challenge is long enough.
    const maxLevel    = challenge.duration_days >= 61 ? 4 : 3
    const targetLevel = Math.min(getLevelForDay(currentDay), maxLevel)

    if (
      targetLevel > challenge.journey_current_level &&
      challenge.pending_journey_event === null
    ) {
      const nextLevel = challenge.journey_current_level + 1

      const gatePassed: boolean = (() => {
        if (nextLevel === 2) return challenge.tuning_evaluation_done    // L1 → L2
        if (nextLevel === 3) return challenge.jamming_phase1_completed  // L2 → L3
        return true                                                      // L3 → L4
      })()

      if (gatePassed) {
        const today      = new Intl.DateTimeFormat('en-CA').format(new Date())
        const newHistory = {
          ...challenge.journey_level_history,
          [String(nextLevel)]: today,
        }
        updates.journey_current_level = nextLevel
        updates.journey_level_history = newHistory
      }
    }

    // ── 7. Write all remaining updates ───────────────────────────────────
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      await sb.from('challenges').update(updates).eq('id', challengeId)

      // Sync user_profile.current_level if the level advanced
      if (updates.journey_current_level !== undefined) {
        await sb
          .from('user_profile')
          .update({
            current_level: updates.journey_current_level as number,
            updated_at:    new Date().toISOString(),
          })
          .eq('user_id', userId)
      }
    }
  } catch (err) {
    // Swallow — this function must never cause submitCheckin to fail.
    console.error('processJourneyMilestones (silent):', err)
  }
}

// ─── Next Pillar Invitation (Step 40) ─────────────────────────────────────────

/**
 * On every check-in: resolves which pillar (if any) warrants an invitation,
 * evaluates the rolling window threshold, and writes the result to
 * user_profile.next_pillar_invitation_pillar.
 *
 * Guards:
 *   - Skips if an invitation is already pending (never overwrites).
 *   - Skips if no threshold config exists for this level (e.g. Grooving, deferred).
 *   - Skips if the rolling window threshold is not yet met.
 *
 * Private — called fire-and-forget from submitCheckin on every check-in.
 * Swallows all errors so it never blocks or fails the check-in.
 */
async function computeAndWriteNextPillarInvitation(
  userId: string,
  level:  number,
  today:  string,   // ISO date — the date of the check-in being submitted
): Promise<void> {
  try {
    const sb = createServerSupabaseClient()

    // ── Guard: skip if an invitation is already pending ──────────────────────
    const { data: profile } = await sb
      .from('user_profile')
      .select('next_pillar_invitation_pillar')
      .eq('user_id', userId)
      .maybeSingle()

    if (profile?.next_pillar_invitation_pillar) return

    // ── Guard: skip if no threshold is defined for this level ────────────────
    const thresholdConfig = INVITATION_THRESHOLDS[level]
    if (!thresholdConfig) return

    // ── Resolve which pillar should be invited ───────────────────────────────
    const { data: pillarRows } = await sb
      .from('pillar_levels')
      .select('*')
      .eq('user_id', userId)

    const invitation = resolveNextPillarInvitation((pillarRows ?? []) as PillarLevel[])
    if (!invitation) return

    // ── Fetch rolling window entries (14 days covers both 7-day and 14-day windows) ──
    const todayMs      = new Date(today + 'T00:00:00Z').getTime()
    const windowStart  = new Date(todayMs - 13 * 86_400_000).toISOString().slice(0, 10)

    const { data: entryRows } = await sb
      .from('daily_entries')
      .select('entry_date, spiritual, physical_goals, nutritional, personal, missional')
      .eq('user_id', userId)
      .gte('entry_date', windowStart)
      .lte('entry_date', today)

    // ── Guard: skip if rolling window threshold is not met ───────────────────
    const { windowDays, minCompletions } = thresholdConfig
    if (
      !meetsRollingWindowThreshold(
        (entryRows ?? []) as GaugeEntryRow[],
        invitation,
        today,
        windowDays,
        minCompletions,
      )
    ) return

    // ── Write the invitation ─────────────────────────────────────────────────
    await sb
      .from('user_profile')
      .update({
        next_pillar_invitation_pillar: invitation,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
  } catch (err) {
    console.error('computeAndWriteNextPillarInvitation (silent):', err)
  }
}

/**
 * Clears next_pillar_invitation_pillar after the user responds — either by
 * accepting the invitation or dismissing it.
 */
export async function clearNextPillarInvitation(): Promise<void> {
  const { userId } = await auth()
  if (!userId) return

  const sb = createServerSupabaseClient()
  await sb
    .from('user_profile')
    .update({
      next_pillar_invitation_pillar: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}

// Maps milestone day numbers to reward types earned on that day
const DAY_REWARDS: Partial<Record<number, RewardType[]>> = {
  1: ['day1_complete'],
  3: ['day3_survival'],
  4: ['halfway'],
  7: ['day7_complete', 'tuning_badge'],
}

export async function submitCheckin(data: {
  date:         string
  challengeId:  string
  startDate:    string
  endDate:      string
  completions:  Record<string, boolean>   // pillarName → complete
  dayNumber:    number
  durationDays?: number  // default 7 (Tuning); 14 or 21 for Jamming
  level?:        number  // default 1
}): Promise<{ newRewards: RewardType[], groovingEligible: boolean, soloingEligible: boolean, groovingComplete: boolean, soloingComplete: boolean, orchestratingEligible: boolean, advancingPillars: string[] }> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()

  // Build the upsert payload — one key per selected pillar
  const payload: Record<string, unknown> = {
    user_id:    userId,
    entry_date: data.date,
    updated_at: new Date().toISOString(),
  }
  for (const [pillar, complete] of Object.entries(data.completions)) {
    const col = PILLAR_COL[pillar]
    if (col) payload[col] = { challenge_complete: complete }
  }

  const { error: entryErr } = await sb
    .from('daily_entries')
    .upsert(payload, { onConflict: 'user_id,entry_date' })
  if (entryErr) throw new Error(`submitCheckin entry: ${entryErr.message}`)

  // Recalculate days_completed from actual entries (idempotent)
  const { data: allEntries } = await sb
    .from('daily_entries')
    .select('entry_date, spiritual, physical_goals, nutritional, personal, missional')
    .eq('user_id', userId)
    .gte('entry_date', data.startDate)
    .lte('entry_date', data.endDate)

  const pillars = Object.keys(data.completions)
  const completeDays = (allEntries ?? []).filter(entry =>
    pillars.every(p => {
      const col = PILLAR_COL[p]
      const val = col ? (entry[col as keyof typeof entry] as Record<string, unknown> | null) : null
      return val?.challenge_complete === true
    })
  ).length

  const durationDays = data.durationDays ?? 7
  const level        = data.level        ?? 1

  await sb.from('challenges').update({
    days_completed:  completeDays,
    consistency_pct: Math.round((completeDays / durationDays) * 100),
    updated_at:      new Date().toISOString(),
  }).eq('id', data.challengeId)

  // ── Award milestone rewards ────────────────────────────────────────────────
  // Only award if every pillar was completed on this save.
  const allComplete = pillars.every(p => data.completions[p])
  let candidateRewards: RewardType[] = []
  if (allComplete) {
    if (level === 1) {
      candidateRewards = DAY_REWARDS[data.dayNumber] ?? []
    } else if (level === 2 && data.dayNumber === durationDays) {
      candidateRewards = ['jamming_badge']
    } else if (level === 3 && data.dayNumber === durationDays) {
      candidateRewards = ['grooving_badge']
    } else if (level === 4 && data.dayNumber === durationDays) {
      candidateRewards = ['soloing_badge']
    }
  }
  const newRewards: RewardType[] = []
  let groovingEligible      = false
  let soloingEligible       = false
  let orchestratingEligible = false
  let advancingPillars:   string[] = []

  if (candidateRewards.length > 0) {
    // Fetch rewards already earned so we know which ones are truly new
    const { data: existing } = await sb
      .from('rewards')
      .select('reward_type')
      .eq('user_id', userId)

    const alreadyEarned = new Set((existing ?? []).map(r => r.reward_type as RewardType))

    for (const rt of candidateRewards) {
      if (alreadyEarned.has(rt)) continue   // already awarded — skip
      const { error: rewardErr } = await sb.from('rewards').insert({
        user_id:      userId,
        reward_type:  rt,
        challenge_id: data.challengeId,
        earned_at:    new Date().toISOString(),
      })
      if (!rewardErr) newRewards.push(rt)
    }
  }

  // ── Rooted milestone check (Level 3, Day 40–50) ────────────────────────────
  // Runs after the entry is saved so today's completion is already in the DB.
  // checkRootedMilestone writes its own reward row + profile flags when it fires.
  if (level === 3 && data.dayNumber >= 40 && data.dayNumber <= 50) {
    const rootedResult = await checkRootedMilestone(userId, data.challengeId)
    if (rootedResult.fired) {
      newRewards.push('rooted_badge')
    }
  }

  // ── Level promotion ───────────────────────────────────────────────────────
  if (newRewards.includes('tuning_badge')) {
    // Day 7 complete → graduate to Level 2
    await sb
      .from('user_profile')
      .update({ current_level: 2, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('current_level', 1)   // guard: only promote from Level 1

    await sb
      .from('challenges')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', data.challengeId)
  }

  if (newRewards.includes('jamming_badge')) {
    // Always mark this Jamming challenge completed
    await sb
      .from('challenges')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', data.challengeId)

    // Grooving unlock: need 2+ completed Jamming challenges totaling 21+ days
    const { data: completedJamming } = await sb
      .from('challenges')
      .select('days_completed')
      .eq('user_id', userId)
      .eq('level', 2)
      .eq('status', 'completed')

    const jammingDaysTotal = (completedJamming ?? []).reduce(
      (sum, c) => sum + (c.days_completed ?? 0), 0
    )
    groovingEligible = (completedJamming?.length ?? 0) >= 2 && jammingDaysTotal >= 21

    if (groovingEligible) {
      // Graduate to Level 3
      await sb
        .from('user_profile')
        .update({ current_level: 3, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('current_level', 2)   // guard: only promote from Level 2
    }
  }

  if (newRewards.includes('grooving_badge')) {
    // Always mark Grooving challenge completed
    await sb
      .from('challenges')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', data.challengeId)

    // Soloing unlock: 60+ day challenge with 80%+ consistency
    const consistencyPct = Math.round((completeDays / durationDays) * 100)
    soloingEligible = durationDays >= 60 && consistencyPct >= 80

    if (soloingEligible) {
      await sb
        .from('user_profile')
        .update({ current_level: 4, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('current_level', 3)
    }
  }

  if (newRewards.includes('soloing_badge')) {
    // Always mark Soloing challenge completed
    await sb
      .from('challenges')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', data.challengeId)

    // Orchestrating unlock: per-pillar — each pillar needs 90+ day challenge and 80%+ consistency.
    if (durationDays >= 90) {
      for (const pillar of pillars) {
        const col = PILLAR_COL[pillar]
        if (!col) continue
        const pillarDays = (allEntries ?? []).filter(entry => {
          const val = entry[col as keyof typeof entry] as Record<string, unknown> | null
          return val?.challenge_complete === true
        }).length
        const pillarPct = Math.round((pillarDays / durationDays) * 100)
        if (pillarPct >= 80) advancingPillars.push(pillar)
      }
    }

    orchestratingEligible = advancingPillars.length > 0

    if (orchestratingEligible) {
      const advancedAt = new Date().toISOString()
      // Promote user_profile level (signals highest pillar reached Orchestrating).
      await sb
        .from('user_profile')
        .update({ current_level: 5, updated_at: advancedAt })
        .eq('user_id', userId)
        .eq('current_level', 4)   // guard: only promote from Level 4
      // Atomically advance each qualifying pillar — neither write should exist without the other.
      await sb
        .from('pillar_levels')
        .update({ level: 5, operating_state: 'anchored', updated_at: advancedAt })
        .eq('user_id', userId)
        .in('pillar', advancingPillars)
        .eq('level', 4)
    }
  }

  revalidatePath('/challenge')
  revalidatePath('/jamming')
  revalidatePath('/grooving')
  revalidatePath('/')

  // Update group_daily_status for all groups the user belongs to.
  // Fire-and-forget: errors are caught inside — this never blocks or fails the check-in.
  void updateGroupDailyStatus(userId, data.date)

  // Process continuous journey milestones (level advancement, evaluations).
  // Fire-and-forget: errors are caught inside — this never blocks or fails the check-in.
  void processJourneyMilestones(userId, data.challengeId, data.date)

  // Evaluate rolling window threshold for Next Pillar Invitation on every check-in.
  // Fire-and-forget: errors are caught inside — this never blocks or fails the check-in.
  void computeAndWriteNextPillarInvitation(userId, level, data.date)

  return {
    newRewards,
    groovingEligible,
    soloingEligible,
    groovingComplete:      newRewards.includes('grooving_badge'),
    soloingComplete:       newRewards.includes('soloing_badge'),
    orchestratingEligible,
    advancingPillars,
  }
}

// ─── Earned rewards (v2) ──────────────────────────────────────────────────────

export async function getEarnedRewards(challengeId: string): Promise<Reward[]> {
  const { userId } = await auth()
  if (!userId) return []

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('rewards')
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .order('earned_at', { ascending: true })

  if (error) { console.error('getEarnedRewards:', error); return [] }
  return (data ?? []) as Reward[]
}

// ─── Onboarding (v2) ──────────────────────────────────────────────────────────

export async function completeOnboarding(data: {
  purposeStatement: string
  selectedPillars: string[]
  goals: Record<string, string>
}): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb    = createServerSupabaseClient()
  const start = todayStr()

  // End date = start + 6 days (7-day challenge, inclusive)
  const startDt = new Date(start + 'T00:00:00')
  startDt.setDate(startDt.getDate() + 6)
  const end = new Intl.DateTimeFormat('en-CA').format(startDt)

  // 1. Update user_profile
  const { error: profileErr } = await sb
    .from('user_profile')
    .update({
      purpose_statement:    data.purposeStatement || null,
      selected_pillars:     data.selectedPillars,
      onboarding_completed: true,
      updated_at:           new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (profileErr) throw new Error(`completeOnboarding profile: ${profileErr.message}`)

  // 2. Create the Level 1 challenge row
  const { error: challengeErr } = await sb
    .from('challenges')
    .insert({
      user_id:      userId,
      level:        1,
      duration_days: 7,
      start_date:   start,
      end_date:     end,
      status:       'active',
      pillar_goals: data.goals,
    })

  if (challengeErr) throw new Error(`completeOnboarding challenge: ${challengeErr.message}`)

  revalidatePath('/')
}

// ─── Jamming challenge (v2) ───────────────────────────────────────────────────

export async function getLastCompletedChallenge(): Promise<Challenge | null> {
  const { userId } = await auth()
  if (!userId) return null

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('challenges')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) { console.error('getLastCompletedChallenge:', error); return null }
  return data as Challenge | null
}

export async function completeJammingOnboarding(data: {
  durationDays:                 14 | 21
  allPillars:                   string[]
  pillarGoals:                  Record<string, string>
  purposeStatement:             string
  accountabilityPartnerName:    string | null
  accountabilityPartnerContact: string | null
}): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb    = createServerSupabaseClient()
  const start = todayStr()

  const startDt = new Date(start + 'T00:00:00')
  startDt.setDate(startDt.getDate() + data.durationDays - 1)
  const end = new Intl.DateTimeFormat('en-CA').format(startDt)

  // 1. Update user_profile: new pillar set + accountability partner + purpose
  const { error: profileErr } = await sb
    .from('user_profile')
    .update({
      selected_pillars:              data.allPillars,
      purpose_statement:             data.purposeStatement || null,
      accountability_partner_name:   data.accountabilityPartnerName,
      accountability_partner_contact: data.accountabilityPartnerContact,
      updated_at:                    new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (profileErr) throw new Error(`completeJammingOnboarding profile: ${profileErr.message}`)

  // 2. Create the Level 2 challenge row
  const { error: challengeErr } = await sb
    .from('challenges')
    .insert({
      user_id:       userId,
      level:         2,
      duration_days: data.durationDays,
      start_date:    start,
      end_date:      end,
      status:        'active',
      pillar_goals:  data.pillarGoals,
    })

  if (challengeErr) throw new Error(`completeJammingOnboarding challenge: ${challengeErr.message}`)

  revalidatePath('/')
  revalidatePath('/challenge')
}

// ─── Continuous Journey (new architecture) ────────────────────────────────────

/**
 * Creates a new continuous journey challenge and updates the user's profile
 * with journey metadata. This is the entry point for all new users under the
 * continuous journey architecture.
 *
 * Legacy users (existing challenges where is_continuous = false) are not
 * affected — this action only creates new rows.
 *
 * Returns the new challenge id so the caller can redirect appropriately.
 */
export async function createContinuousJourney(data: {
  name:            string
  totalDays:       number
  selectedPillars: string[]
  pillarGoals:     Record<string, string>
}): Promise<{ challengeId: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb    = createServerSupabaseClient()
  const start = todayStr()
  const end   = addDaysToDate(start, data.totalDays - 1)

  const preview = calculateJourneyPreview(data.totalDays)

  // 1. Create the challenge row
  //    level = 1 reflects the starting state; journey_current_level is the
  //    authoritative level for continuous challenges and advances via
  //    processJourneyMilestones. The legacy `level` column is never updated
  //    for continuous challenges.
  const { data: inserted, error: challengeErr } = await sb
    .from('challenges')
    .insert({
      user_id:                 userId,
      level:                   1,
      duration_days:           data.totalDays,
      start_date:              start,
      end_date:                end,
      status:                  'active',
      pillar_goals:            data.pillarGoals,
      carried_forward_pillars: [],
      is_continuous:           true,
      journey_current_level:   1,
      journey_level_history:   {},
    })
    .select('id')
    .single()

  if (challengeErr || !inserted) {
    throw new Error(
      `createContinuousJourney challenge: ${challengeErr?.message ?? 'no data returned'}`,
    )
  }

  // 2. Upsert user_profile with journey metadata and pillar selection
  const { error: profileErr } = await sb
    .from('user_profile')
    .upsert({
      user_id:               userId,
      current_level:         1,
      selected_pillars:      data.selectedPillars,
      journey_start_date:    start,
      journey_total_days:    data.totalDays,
      journey_level_preview: preview,
      name:                  data.name,
      onboarding_completed:  true,
      updated_at:            new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (profileErr) {
    throw new Error(`createContinuousJourney profile: ${profileErr.message}`)
  }

  revalidatePath('/journey')
  revalidatePath('/onboarding')
  revalidatePath('/')

  return { challengeId: inserted.id as string }
}

// =============================================================================
// Continuous Journey — Acknowledgment Actions
// =============================================================================

/**
 * Called when the user dismisses TuningEvaluationModal.
 * Advances journey_current_level to 2, records the transition date in
 * journey_level_history, and clears pending_journey_event.
 *
 * All three TuningOutcome values result in advancement — the continuous
 * journey has no "go back to Day 1" path. The modal variant handles the
 * tone; the action always moves the user forward.
 */
export async function acknowledgeTuningCompletion(challengeId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()

  const { data: challenge } = await sb
    .from('challenges')
    .select('id, journey_level_history, pending_journey_event')
    .eq('id', challengeId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!challenge) return
  if ((challenge.pending_journey_event as { type?: string } | null)?.type !== 'tuning_evaluation') return

  const history = {
    ...(challenge.journey_level_history as Record<string, string>),
    '2': todayStr(),
  }

  await sb
    .from('challenges')
    .update({
      journey_current_level: 2,
      journey_level_history: history,
      pending_journey_event: null,
    })
    .eq('id', challengeId)
    .eq('user_id', userId)

  await sb
    .from('user_profile')
    .update({ current_level: 2 })
    .eq('user_id', userId)

  revalidatePath('/journey')
}

/**
 * Called when the user dismisses JammingPhase2Modal.
 * Marks phase 2 as accepted and clears pending_journey_event.
 * jamming_phase2_unlocked is already set by processJourneyMilestones;
 * this action just records the user's acknowledgment.
 */
export async function acknowledgeJammingPhase2(challengeId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()

  await sb
    .from('challenges')
    .update({
      jamming_phase2_accepted: true,
      pending_journey_event:   null,
    })
    .eq('id', challengeId)
    .eq('user_id', userId)

  revalidatePath('/journey')
}

// ─── Pulse check (v2 — Jamming) ───────────────────────────────────────────────

// Notification tier that maps to each pulse state
const PULSE_TIER: Record<PulseState, UserProfile['notification_tier']> = {
  smooth_sailing:  'minimal',
  rough_waters:    'standard',
  taking_on_water: 'full',
}

// Returns 'complete' | 'partial' | 'missed' for a given entry row
function dayCompletionStatus(
  entry: Record<string, unknown> | undefined,
  pillars: string[],
): 'complete' | 'partial' | 'missed' {
  if (!entry) return 'missed'
  const completed = pillars.filter(p => {
    const col = PILLAR_COL[p]
    const val = col ? (entry[col] as Record<string, unknown> | null) : null
    return val?.challenge_complete === true
  })
  if (completed.length === pillars.length) return 'complete'
  if (completed.length > 0) return 'partial'
  return 'missed'
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

export async function getPendingPulseCheck(params: {
  challengeId: string
  startDate:   string
  pillars:     string[]
}): Promise<PendingPulseCheck | null> {
  const { userId } = await auth()
  if (!userId) return null

  const sb = createServerSupabaseClient()

  // Fetch profile for cooldown + notification tier
  const { data: profile } = await sb
    .from('user_profile')
    .select('last_pulse_check_at, notification_tier')
    .eq('user_id', userId)
    .single()

  if (!profile) return null

  // 48-hour cooldown — never show two pulse checks within 48 hours
  if (profile.last_pulse_check_at) {
    const hoursSinceLast =
      (Date.now() - new Date(profile.last_pulse_check_at).getTime()) / 3_600_000
    if (hoursSinceLast < 48) return null
  }

  // Calculate today's day number in the challenge (1-indexed)
  const today     = todayStr()
  const startMs   = new Date(params.startDate + 'T00:00:00').getTime()
  const todayMs   = new Date(today            + 'T00:00:00').getTime()
  const dayNumber = Math.max(Math.floor((todayMs - startMs) / 86_400_000) + 1, 1)
  const weekNumber = Math.ceil(dayNumber / 7)

  // ── Priority 1: Scheduled weekly trigger (fires on day 7, 14, 21 …) ────────
  if (dayNumber > 0 && dayNumber % 7 === 0) {
    const { data: existing } = await sb
      .from('pulse_checks')
      .select('id')
      .eq('user_id', userId)
      .eq('challenge_id', params.challengeId)
      .eq('week_number', weekNumber)
      .maybeSingle()

    if (!existing) {
      return { weekNumber, triggerType: 'scheduled_weekly' }
    }
  }

  // Event triggers only fire for non-Smooth Sailing users
  const isSmooth = profile.notification_tier === 'minimal'
  if (isSmooth) return null

  // Fetch yesterday + day-before-yesterday entries (exclude today — may be mid check-in)
  const yesterday   = offsetDate(today, -1)
  const twoDaysAgo  = offsetDate(today, -2)

  // Only look within the challenge window
  if (yesterday < params.startDate) return null

  const { data: recentRows } = await sb
    .from('daily_entries')
    .select('entry_date, spiritual, physical_goals, nutritional, personal')
    .eq('user_id', userId)
    .gte('entry_date', twoDaysAgo)
    .lt('entry_date', today)
    .order('entry_date', { ascending: false })

  const entryMap = new Map(
    (recentRows ?? []).map(r => [r.entry_date as string, r as Record<string, unknown>])
  )

  const yesterdayStatus = dayCompletionStatus(entryMap.get(yesterday), params.pillars)

  // ── Priority 2: Missed day trigger ──────────────────────────────────────────
  if (yesterdayStatus === 'missed') {
    return { weekNumber, triggerType: 'missed_day' }
  }

  // ── Priority 3: Two consecutive partial completions ──────────────────────────
  if (twoDaysAgo >= params.startDate) {
    const twoDaysAgoStatus = dayCompletionStatus(entryMap.get(twoDaysAgo), params.pillars)
    if (yesterdayStatus === 'partial' && twoDaysAgoStatus === 'partial') {
      return { weekNumber, triggerType: 'partial_completion' }
    }
  }

  return null
}

export async function recordPulseCheck(data: {
  challengeId: string
  weekNumber:  number
  pulseState:  PulseState
  triggerType: PulseTrigger
}): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb  = createServerSupabaseClient()
  const now = new Date().toISOString()

  // Insert the pulse check record
  const { error: insertErr } = await sb.from('pulse_checks').insert({
    user_id:      userId,
    challenge_id: data.challengeId,
    week_number:  data.weekNumber,
    pulse_state:  data.pulseState,
    trigger_type: data.triggerType,
    recorded_at:  now,
  })
  if (insertErr) throw new Error(`recordPulseCheck insert: ${insertErr.message}`)

  // Update notification_tier + last_pulse_check_at on user_profile
  const { error: updateErr } = await sb
    .from('user_profile')
    .update({
      notification_tier:    PULSE_TIER[data.pulseState],
      last_pulse_check_at:  now,
      updated_at:           now,
    })
    .eq('user_id', userId)
  if (updateErr) throw new Error(`recordPulseCheck profile: ${updateErr.message}`)

  revalidatePath('/challenge')
  revalidatePath('/jamming')
}

export async function getPulseHistory(challengeId: string): Promise<PulseCheck[]> {
  const { userId } = await auth()
  if (!userId) return []

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('pulse_checks')
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .order('recorded_at', { ascending: true })

  if (error) { console.error('getPulseHistory:', error); return [] }
  return (data ?? []) as PulseCheck[]
}

// ─── Weekly reflection (v2 — Grooving) ───────────────────────────────────────

export async function getWeeklyReflection(
  challengeId: string,
  weekNumber:  number,
): Promise<WeeklyReflection | null> {
  const { userId } = await auth()
  if (!userId) return null

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('weekly_reflections')
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .eq('week_number', weekNumber)
    .maybeSingle()

  if (error) { console.error('getWeeklyReflection:', error); return null }
  return (data as WeeklyReflection) ?? null
}

export async function saveWeeklyReflectionWithPulse(data: {
  challengeId:             string
  weekNumber:              number
  reflectionQuestion:      string
  reflectionAnswer:        string | null
  pulseState:              PulseState
  destinationGoalStatus:   DestinationGoalCheckInStatus | null
  destinationGoalStatuses?: { destination_goal_id: string; hits_this_week: number; frequency_target: number }[] | null
  shareWithCircle:         boolean
  // Monthly Pillar Check — present only when the 30-day cadence check fired this session
  pillarCheckPillar?:      string | null
  pillarCheckAnswer?:      string | null
}): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb  = createServerSupabaseClient()
  const now = new Date().toISOString()

  // 1. Save the weekly reflection record (includes pillar check fields when present)
  const { error: reflectionErr } = await sb.from('weekly_reflections').insert({
    user_id:                   userId,
    challenge_id:              data.challengeId,
    week_number:               data.weekNumber,
    reflection_question:       data.reflectionQuestion,
    reflection_answer:         data.reflectionAnswer,
    destination_goal_status:   data.destinationGoalStatus,
    destination_goal_statuses: data.destinationGoalStatuses ?? null,
    share_with_circle:         data.shareWithCircle,
    pillar_check_pillar:       data.pillarCheckPillar ?? null,
    pillar_check_answer:       data.pillarCheckAnswer ?? null,
    created_at:                now,
  })
  if (reflectionErr) throw new Error(`saveWeeklyReflection insert: ${reflectionErr.message}`)

  // 2. Record the pulse check (same as recordPulseCheck)
  const { error: pulseErr } = await sb.from('pulse_checks').insert({
    user_id:      userId,
    challenge_id: data.challengeId,
    week_number:  data.weekNumber,
    pulse_state:  data.pulseState,
    trigger_type: 'scheduled_weekly' as PulseTrigger,
    recorded_at:  now,
  })
  if (pulseErr) throw new Error(`saveWeeklyReflection pulse insert: ${pulseErr.message}`)

  // 3. Update notification_tier + last_pulse_check_at on user_profile.
  //    When the monthly pillar check fired, also stamp last_pillar_check_at.
  const profileUpdate: Record<string, unknown> = {
    notification_tier:   PULSE_TIER[data.pulseState],
    last_pulse_check_at: now,
    updated_at:          now,
  }
  if (data.pillarCheckPillar) {
    profileUpdate.last_pillar_check_at = now
  }

  const { error: profileErr } = await sb
    .from('user_profile')
    .update(profileUpdate)
    .eq('user_id', userId)
  if (profileErr) throw new Error(`saveWeeklyReflection profile update: ${profileErr.message}`)

  revalidatePath('/grooving')
}

// Soloing weekly reflection — no pulse state, no Grooving Circle share.
// Stores the stewardship reflection question + answer, destination goal statuses,
// and the optional monthly pillar check. Stamps last_pillar_check_at when it fires.
export async function saveWeeklyReflectionSoloing(data: {
  challengeId:             string
  weekNumber:              number
  reflectionQuestion:      string
  reflectionAnswer:        string | null
  destinationGoalStatuses: { destination_goal_id: string; hits_this_week: number; frequency_target: number }[] | null
  pillarCheckPillar?:      string | null
  pillarCheckAnswer?:      string | null
}): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb  = createServerSupabaseClient()
  const now = new Date().toISOString()

  // 1. Save the weekly reflection record
  const { error: reflectionErr } = await sb.from('weekly_reflections').insert({
    user_id:                   userId,
    challenge_id:              data.challengeId,
    week_number:               data.weekNumber,
    reflection_question:       data.reflectionQuestion,
    reflection_answer:         data.reflectionAnswer,
    destination_goal_status:   null,     // Soloing has no single-goal pulse status
    destination_goal_statuses: data.destinationGoalStatuses ?? null,
    share_with_circle:         false,    // No Grooving Circle at Soloing
    pillar_check_pillar:       data.pillarCheckPillar ?? null,
    pillar_check_answer:       data.pillarCheckAnswer ?? null,
    created_at:                now,
  })
  if (reflectionErr) throw new Error(`saveWeeklyReflectionSoloing insert: ${reflectionErr.message}`)

  // 2. When the monthly pillar check fired, stamp last_pillar_check_at
  if (data.pillarCheckPillar) {
    const { error: profileErr } = await sb
      .from('user_profile')
      .update({ last_pillar_check_at: now, updated_at: now })
      .eq('user_id', userId)
    if (profileErr) throw new Error(`saveWeeklyReflectionSoloing profile update: ${profileErr.message}`)
  }

  revalidatePath('/soloing')
}

// ─── Grooving onboarding (v2) ─────────────────────────────────────────────────

export async function completeGroovingOnboarding(data: {
  durationDays:          30 | 50 | 66
  allPillars:            string[]
  pillarGoals:           Record<string, string>
  carriedForwardPillars: string[]   // pillars whose goals were pre-populated from a previous challenge
  focusList25:           string[]
  focusTop5:             FocusTop5Item[]
  circleMembers:         { name: string; contact: string }[]
}): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb    = createServerSupabaseClient()
  const start = todayStr()

  const startDt = new Date(start + 'T00:00:00')
  startDt.setDate(startDt.getDate() + data.durationDays - 1)
  const end = new Intl.DateTimeFormat('en-CA').format(startDt)

  // 1. Update user_profile: pillars + 25/5 focus data
  const { error: profileErr } = await sb
    .from('user_profile')
    .update({
      selected_pillars: data.allPillars,
      focus_list_25:    data.focusList25.length > 0 ? data.focusList25 : null,
      focus_top_5:      data.focusTop5.length  > 0 ? data.focusTop5   : null,
      updated_at:       new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (profileErr) throw new Error(`completeGroovingOnboarding profile: ${profileErr.message}`)

  // 2. Create the Level 3 challenge row
  const { error: challengeErr } = await sb
    .from('challenges')
    .insert({
      user_id:                  userId,
      level:                    3,
      duration_days:            data.durationDays,
      start_date:               start,
      end_date:                 end,
      status:                   'active',
      pillar_goals:             data.pillarGoals,
      carried_forward_pillars:  data.carriedForwardPillars,
    })

  if (challengeErr) throw new Error(`completeGroovingOnboarding challenge: ${challengeErr.message}`)

  // 3. Insert Grooving Circle members (if any)
  if (data.circleMembers.length > 0) {
    const members = data.circleMembers.map(m => ({
      user_id:        userId,
      member_name:    m.name.trim(),
      member_contact: m.contact.trim(),
    }))
    const { error: circleErr } = await sb.from('grooving_circle_members').insert(members)
    if (circleErr) throw new Error(`completeGroovingOnboarding circle: ${circleErr.message}`)
  }

  revalidatePath('/')
  revalidatePath('/grooving')
}

// ─── Grooving transition (v2) ─────────────────────────────────────────────────

export async function saveWhatChangedReflection(answer: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  const { error } = await sb
    .from('user_profile')
    .update({ what_changed_reflection: answer.trim(), updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) throw new Error(`saveWhatChangedReflection: ${error.message}`)
}

// ─── 25/5 Focus Exercise (v2 — Grooving, standalone save) ────────────────────
// Used when the user completes the exercise from the dashboard after skipping it
// during onboarding. Onboarding uses completeGroovingOnboarding which bundles all data.

export async function saveFocusExercise(data: {
  focusList25: string[]
  focusTop5:   FocusTop5Item[]
}): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  const { error } = await sb
    .from('user_profile')
    .update({
      focus_list_25: data.focusList25.length > 0 ? data.focusList25 : null,
      focus_top_5:   data.focusTop5.length   > 0 ? data.focusTop5   : null,
      updated_at:    new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) throw new Error(`saveFocusExercise: ${error.message}`)
  revalidatePath('/grooving')
}

// ─── Destination goals (v2 — Grooving) ───────────────────────────────────────

export async function getDestinationGoals(challengeId: string): Promise<DestinationGoal[]> {
  const { userId } = await auth()
  if (!userId) return []

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('destination_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: true })

  if (error) { console.error('getDestinationGoals:', error); return [] }
  return (data ?? []) as DestinationGoal[]
}

// Phase 5 — query the duration_goal_destinations table (new schema after Step 43 migration).
// Separate from getDestinationGoals which queries the legacy destination_goals table.
export async function getActiveDurationGoalDestinations(
  challengeId: string
): Promise<DurationGoalDestination[]> {
  const { userId } = await auth()
  if (!userId) return []

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('duration_goal_destinations')
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (error) { console.error('getActiveDurationGoalDestinations:', error); return [] }
  return (data ?? []) as DurationGoalDestination[]
}

export async function getPillarLevels(): Promise<PillarLevel[]> {
  const { userId } = await auth()
  if (!userId) return []

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('pillar_levels')
    .select('*')
    .eq('user_id', userId)

  if (error) { console.error('getPillarLevels:', error); return [] }
  return (data ?? []) as PillarLevel[]
}

// Phase 5 — Add a new destination goal row to duration_goal_destinations.
export async function addDurationGoalDestination(input: {
  challengeId:     string
  pillar:          string
  goalName:        string
  frequencyTarget: number
  windowDays:      number
  startDate:       string
  endDate:         string
}): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: 'Unauthorized' }

  const sb = createServerSupabaseClient()
  const { error } = await sb
    .from('duration_goal_destinations')
    .insert({
      user_id:          userId,
      challenge_id:     input.challengeId,
      pillar:           input.pillar,
      goal_name:        input.goalName,
      frequency_target: input.frequencyTarget,
      frequency_unit:   'weekly',
      window_days:      input.windowDays,
      start_date:       input.startDate,
      end_date:         input.endDate,
      status:           'active',
    })

  if (error) {
    console.error('addDurationGoalDestination:', error)
    return { success: false, error: 'Failed to save goal.' }
  }
  return { success: true }
}

// Phase 5 — Set a destination goal's status to 'released'.
export async function releaseDurationGoalDestination(
  goalId: string
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: 'Unauthorized' }

  const sb = createServerSupabaseClient()
  const { error } = await sb
    .from('duration_goal_destinations')
    .update({ status: 'released' })
    .eq('id', goalId)
    .eq('user_id', userId)

  if (error) {
    console.error('releaseDurationGoalDestination:', error)
    return { success: false, error: 'Failed to release goal.' }
  }
  return { success: true }
}

// Phase 5 — Step 47: Mark the G6b video as triggered for this user (one-time).
// Called after the first destination goal is successfully saved from the Goals tab.
export async function markG6bTriggered(): Promise<void> {
  const { userId } = await auth()
  if (!userId) return

  const sb = createServerSupabaseClient()
  const { error } = await sb
    .from('user_profile')
    .update({ video_g6b_triggered: true })
    .eq('user_id', userId)

  if (error) console.error('markG6bTriggered:', error)
}

/**
 * Create or update a destination goal for a pillar.
 * One active goal per pillar per challenge is enforced: if one already exists it is updated.
 */
export async function createDestinationGoal(data: {
  challengeId:   string
  pillar:        string
  goalName:      string
  targetDate:    string | null
  focusItemRank: number | null
}): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()

  // Look for an existing active goal for this pillar in this challenge
  const { data: existing } = await sb
    .from('destination_goals')
    .select('id')
    .eq('user_id', userId)
    .eq('challenge_id', data.challengeId)
    .eq('pillar', data.pillar)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    const { error } = await sb
      .from('destination_goals')
      .update({
        goal_name:       data.goalName.trim(),
        target_date:     data.targetDate ?? null,
        focus_item_rank: data.focusItemRank ?? null,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) throw new Error(`createDestinationGoal update: ${error.message}`)
  } else {
    const { error } = await sb
      .from('destination_goals')
      .insert({
        user_id:         userId,
        challenge_id:    data.challengeId,
        pillar:          data.pillar,
        goal_name:       data.goalName.trim(),
        target_date:     data.targetDate ?? null,
        focus_item_rank: data.focusItemRank ?? null,
        status:          'active',
      })
    if (error) throw new Error(`createDestinationGoal insert: ${error.message}`)
  }

  revalidatePath('/grooving')
}

export async function recordDestinationGoalStatus(
  goalId: string,
  status: 'reached' | 'released',
): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  const { error } = await sb
    .from('destination_goals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('user_id', userId)

  if (error) throw new Error(`recordDestinationGoalStatus: ${error.message}`)
  revalidatePath('/grooving')
}

// ─── Grooving completion navigation (Step 30) ─────────────────────────────────

// Start a new Grooving challenge, copying the most recent completed one.
// Resets rooted milestone so the user can earn it again on the new run.
export async function startGroovingAgain(completedChallengeId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb  = createServerSupabaseClient()
  const now = new Date().toISOString()

  // Fetch the completed challenge to carry forward its shape
  const { data: prev, error: fetchErr } = await sb
    .from('challenges')
    .select('pillar_goals, carried_forward_pillars, duration_days')
    .eq('id', completedChallengeId)
    .eq('user_id', userId)
    .single()
  if (fetchErr || !prev) throw new Error('startGroovingAgain: could not load previous challenge')

  const start    = todayStr()
  const startD   = new Date(start + 'T00:00:00')
  startD.setDate(startD.getDate() + (prev.duration_days - 1))
  const end      = new Intl.DateTimeFormat('en-CA').format(startD)

  // Create new active level-3 challenge
  const { error: challengeErr } = await sb
    .from('challenges')
    .insert({
      user_id:                 userId,
      level:                   3,
      duration_days:           prev.duration_days,
      start_date:              start,
      end_date:                end,
      status:                  'active',
      pillar_goals:            prev.pillar_goals,
      carried_forward_pillars: prev.carried_forward_pillars ?? [],
    })
  if (challengeErr) throw new Error(`startGroovingAgain insert: ${challengeErr.message}`)

  // Reset rooted milestone so the user can earn it on the new run
  const { error: profileErr } = await sb
    .from('user_profile')
    .update({
      rooted_milestone_fired: false,
      rooted_milestone_date:  null,
      updated_at:             now,
    })
    .eq('user_id', userId)
  if (profileErr) throw new Error(`startGroovingAgain profile reset: ${profileErr.message}`)

  revalidatePath('/')
  revalidatePath('/grooving')
}

// ─── Challenge pause system (Step 27 — Grooving level) ────────────────────────
//
// One pause per challenge.  Flow:
//   pauseChallenge → is_paused = true, pause_used = true, writes challenge_pauses row
//   resumeChallenge / autoResumePausedChallenges → is_paused = false, extends end_date
//
// pause_used stays true permanently so the option disappears after one use.

export type PauseReason = 'travel' | 'illness' | 'family' | 'work' | 'other'

export interface PauseStatus {
  isPaused:    boolean
  pauseUsed:   boolean
  pauseRecord: ChallengePause | null
}

// Helper date formatter — identical to the pattern used in all page files.
function addCalendarDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

// ── Internal resume executor ──────────────────────────────────────────────────
// Shared by resumeChallenge (user-initiated) and autoResumePausedChallenges (cron).
// Caller is responsible for validating the challenge exists and is_paused = true.
// Creates its own Supabase client — safe to call without a user auth context.

async function _performResume(challenge: Challenge): Promise<Challenge> {
  const sb = createServerSupabaseClient()

  // Find the open (not yet closed) pause record for this challenge
  const { data: pauseRecord, error: pauseFetchErr } = await sb
    .from('challenge_pauses')
    .select('*')
    .eq('challenge_id', challenge.id)
    .is('resumed_at', null)
    .order('paused_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (pauseFetchErr || !pauseRecord) {
    throw new Error(`_performResume: no open pause record found for challenge ${challenge.id}`)
  }

  const resumedAt  = new Date()
  const pausedAt   = new Date(pauseRecord.paused_at as string)
  const msPaused   = resumedAt.getTime() - pausedAt.getTime()
  const daysPaused = Math.max(Math.ceil(msPaused / 86_400_000), 1)
  const newEndDate = addCalendarDays(challenge.end_date, daysPaused)
  const now        = resumedAt.toISOString()

  // 1. Un-pause the challenge and extend the end date
  const { data: updated, error: challengeErr } = await sb
    .from('challenges')
    .update({ is_paused: false, end_date: newEndDate, updated_at: now })
    .eq('id', challenge.id)
    .select('*')
    .single()

  if (challengeErr || !updated) {
    throw new Error(`_performResume challenge update: ${challengeErr?.message ?? 'no data returned'}`)
  }

  // 2. Close the pause record
  const { error: pauseErr } = await sb
    .from('challenge_pauses')
    .update({ resumed_at: now, days_paused: daysPaused })
    .eq('id', pauseRecord.id as string)

  if (pauseErr) throw new Error(`_performResume pause record update: ${pauseErr.message}`)

  revalidatePath('/grooving')
  return updated as Challenge
}

// ── pauseChallenge ─────────────────────────────────────────────────────────────

export async function pauseChallenge(
  challengeId: string,
  reason:      PauseReason,
): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()

  const { data: challenge, error: fetchErr } = await sb
    .from('challenges')
    .select('id, level, status, is_paused, pause_used')
    .eq('id', challengeId)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchErr || !challenge) throw new Error('Challenge not found')
  if ((challenge.status as string) !== 'active')      throw new Error('Challenge is not active')
  if ((challenge.level  as number) !== 3)             throw new Error('Pause is only available at the Grooving level.')
  if (challenge.pause_used as boolean)                throw new Error('You have already used your pause for this challenge')
  if (challenge.is_paused  as boolean)                throw new Error('Challenge is already paused')

  const now = new Date().toISOString()

  const { error: challengeErr } = await sb
    .from('challenges')
    .update({ is_paused: true, pause_used: true, updated_at: now })
    .eq('id', challengeId)
    .eq('user_id', userId)

  if (challengeErr) throw new Error(`pauseChallenge update: ${challengeErr.message}`)

  const { error: pauseErr } = await sb
    .from('challenge_pauses')
    .insert({
      user_id:      userId,
      challenge_id: challengeId,
      pause_reason: reason,
      paused_at:    now,
    })

  if (pauseErr) throw new Error(`pauseChallenge insert pause record: ${pauseErr.message}`)

  revalidatePath('/grooving')
}

// ── resumeChallenge ────────────────────────────────────────────────────────────

export async function resumeChallenge(challengeId: string): Promise<Challenge> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()

  const { data: challenge, error: fetchErr } = await sb
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchErr || !challenge) throw new Error('Challenge not found')
  if ((challenge.status as string) !== 'active') throw new Error('Challenge is not active')
  if (!(challenge.is_paused as boolean))          throw new Error('Challenge is not currently paused')

  return _performResume(challenge as Challenge)
}

// ── getPauseStatus ─────────────────────────────────────────────────────────────

export async function getPauseStatus(challengeId: string): Promise<PauseStatus> {
  const { userId } = await auth()
  if (!userId) return { isPaused: false, pauseUsed: false, pauseRecord: null }

  const sb = createServerSupabaseClient()

  const [challengeRes, pauseRes] = await Promise.all([
    sb
      .from('challenges')
      .select('is_paused, pause_used')
      .eq('id', challengeId)
      .eq('user_id', userId)
      .maybeSingle(),
    sb
      .from('challenge_pauses')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .order('paused_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!challengeRes.data) return { isPaused: false, pauseUsed: false, pauseRecord: null }

  return {
    isPaused:    (challengeRes.data.is_paused  ?? false) as boolean,
    pauseUsed:   (challengeRes.data.pause_used ?? false) as boolean,
    pauseRecord: (pauseRes.data ?? null) as ChallengePause | null,
  }
}

// ── autoResumePausedChallenges ─────────────────────────────────────────────────
// Called by the morning cron run.  No user auth context — operates via service role.
// Any challenge paused more than 14 days ago is automatically resumed.
// All errors are caught internally — a failure must never crash the cron.

export async function autoResumePausedChallenges(): Promise<void> {
  try {
    const sb      = createServerSupabaseClient()
    const cutoff  = new Date(Date.now() - 14 * 86_400_000).toISOString()

    // Find open pause records older than 14 days
    const { data: overduePauses, error: pauseFetchErr } = await sb
      .from('challenge_pauses')
      .select('challenge_id')
      .is('resumed_at', null)
      .lt('paused_at', cutoff)

    if (pauseFetchErr) {
      console.error('[autoResumePausedChallenges] fetch overdue pauses:', pauseFetchErr)
      return
    }

    if (!overduePauses || overduePauses.length === 0) return

    const challengeIds = overduePauses.map(p => p.challenge_id as string)

    // Fetch the corresponding challenges — must be active and currently paused
    const { data: challenges, error: challengeFetchErr } = await sb
      .from('challenges')
      .select('*')
      .in('id', challengeIds)
      .eq('status', 'active')
      .eq('is_paused', true)

    if (challengeFetchErr) {
      console.error('[autoResumePausedChallenges] fetch challenges:', challengeFetchErr)
      return
    }

    if (!challenges || challenges.length === 0) return

    for (const challenge of challenges) {
      try {
        await _performResume(challenge as Challenge)
        console.log(`[autoResumePausedChallenges] resumed challenge ${challenge.id as string}`)
      } catch (err) {
        console.error(`[autoResumePausedChallenges] failed to resume ${challenge.id as string}:`, err)
      }
    }
  } catch (err) {
    console.error('[autoResumePausedChallenges] unexpected top-level error:', err)
  }
}

// ─── Video progress (v2) ──────────────────────────────────────────────────────

export async function getWatchedVideoIds(): Promise<string[]> {
  const { userId } = await auth()
  if (!userId) return []

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('video_progress')
    .select('video_id')
    .eq('user_id', userId)

  if (error) { console.error('getWatchedVideoIds:', error); return [] }
  return (data ?? []).map(row => row.video_id as string)
}

export async function markVideoWatched(videoId: string, triggeredBy: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  const { error } = await sb
    .from('video_progress')
    .upsert(
      { user_id: userId, video_id: videoId, triggered_by: triggeredBy, watched_at: new Date().toISOString() },
      { onConflict: 'user_id,video_id' }
    )

  if (error) throw new Error(`markVideoWatched: ${error.message}`)
  revalidatePath('/challenge')
}

// ─── Config ───────────────────────────────────────────────────────────────────

export async function getUserConfig(): Promise<UserConfig | null> {
  const { userId } = await auth()
  if (!userId) return null

  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('user_config')
    .select('name, start_date, duration')
    .eq('user_id', userId)
    .maybeSingle()

  return data ?? null
}

export async function saveUserConfig(config: UserConfig) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  const { error } = await sb.from('user_config').upsert(
    { user_id: userId, ...config, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(`saveUserConfig: ${error.message}`)
  revalidatePath('/')
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function getUserGoals(): Promise<UserGoals> {
  const { userId } = await auth()
  if (!userId) return defaultGoals()

  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('user_goals')
    .select('spiritual, physical, exercise_types, stretching_types, nutritional, personal')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return defaultGoals()

  const defs = defaultGoals()
  return {
    spiritual:       mergePillarGoals(data.spiritual, defs.spiritual),
    physical:        mergePillarGoals(data.physical,  defs.physical),
    exerciseTypes:   data.exercise_types   ?? [],
    stretchingTypes: data.stretching_types ?? [],
    nutritional:     data.nutritional      ?? [],
    personal:        mergePillarGoals(data.personal,  defs.personal),
  }
}

export async function saveUserGoals(goals: UserGoals) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  const { error } = await sb.from('user_goals').upsert(
    {
      user_id:          userId,
      spiritual:        goals.spiritual,
      physical:         goals.physical,
      exercise_types:   goals.exerciseTypes,
      stretching_types: goals.stretchingTypes,
      nutritional:      goals.nutritional,
      personal:         goals.personal,
      updated_at:       new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(`saveUserGoals: ${error.message}`)
  revalidatePath('/dashboard')
}

// ─── Daily entries ────────────────────────────────────────────────────────────

export async function getEntry(date?: string): Promise<DailyEntry | null> {
  const { userId } = await auth()
  if (!userId) return null

  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('daily_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_date', date ?? todayStr())
    .maybeSingle()

  if (!data) return null

  return {
    entry_date:        data.entry_date,
    spiritual:         data.spiritual         ?? {},
    physical_goals:    data.physical_goals    ?? {},
    activities:        data.activities        ?? [],
    sleep:             data.sleep             ?? null,
    weight:            data.weight            ?? null,
    blood_pressure:    data.blood_pressure    ?? null,
    nutritional:       data.nutritional       ?? {},
    nutritional_log:   data.nutritional_log   ?? {},
    personal:          data.personal          ?? {},
    tiered_selections: data.tiered_selections ?? {},
  }
}

export async function saveEntry(entry: DailyEntry) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  const { error } = await sb.from('daily_entries').upsert(
    {
      user_id:         userId,
      entry_date:      entry.entry_date,
      spiritual:       entry.spiritual,
      physical_goals:  entry.physical_goals,
      activities:      entry.activities,
      sleep:           entry.sleep,
      weight:          entry.weight,
      blood_pressure:  entry.blood_pressure,
      nutritional:       entry.nutritional,
      nutritional_log:   entry.nutritional_log   ?? {},
      personal:          entry.personal,
      tiered_selections: entry.tiered_selections ?? {},
      updated_at:      new Date().toISOString(),
    },
    { onConflict: 'user_id,entry_date' }
  )
  if (error) throw new Error(`saveEntry: ${error.message}`)
  revalidatePath('/dashboard')
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getHistory(limit = 90): Promise<DailyEntry[]> {
  const { userId } = await auth()
  if (!userId) return []

  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('daily_entries')
    .select('*')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .limit(limit)

  return (data ?? []).map(row => ({
    entry_date:        row.entry_date,
    spiritual:         row.spiritual         ?? {},
    physical_goals:    row.physical_goals    ?? {},
    activities:        row.activities        ?? [],
    sleep:             row.sleep             ?? null,
    weight:            row.weight            ?? null,
    blood_pressure:    row.blood_pressure    ?? null,
    nutritional:       row.nutritional       ?? {},
    nutritional_log:   row.nutritional_log   ?? {},
    personal:          row.personal          ?? {},
    tiered_selections: row.tiered_selections ?? {},
    updated_at:        row.updated_at        ?? undefined,
  }))
}

// ─── Weekly notes ─────────────────────────────────────────────────────────────

export async function getWeeklyNote(weekStart: string): Promise<string> {
  const { userId } = await auth()
  if (!userId) return ''

  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('weekly_notes')
    .select('notes')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle()

  return data?.notes ?? ''
}

export async function saveWeeklyNote(weekStart: string, notes: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  const { error } = await sb.from('weekly_notes').upsert(
    { user_id: userId, week_start: weekStart, notes, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,week_start' }
  )
  if (error) throw new Error(`saveWeeklyNote: ${error.message}`)
}

// ─── Setup: save config + goals together ─────────────────────────────────────

export async function finishSetup(config: UserConfig, goals: UserGoals) {
  await saveUserConfig(config)
  await saveUserGoals(goals)
  revalidatePath('/')
}

// ─── Challenge goals update (v2) ──────────────────────────────────────────────

export async function updatePillarGoals(
  challengeId: string,
  goals: Record<string, string>,
): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  const { error } = await sb
    .from('challenges')
    .update({ pillar_goals: goals, updated_at: new Date().toISOString() })
    .eq('id', challengeId)
    .eq('user_id', userId)

  if (error) throw new Error(`updatePillarGoals: ${error.message}`)
  revalidatePath('/challenge')
  revalidatePath('/jamming')
  revalidatePath('/grooving')
}

// ─── Consistency Profile (Phase 4) ───────────────────────────────────────────

function scoreToLevel(score: number): number {
  if (score <= 3) return 1
  if (score <= 6) return 2
  if (score <= 9) return 3
  return 4
}

export async function saveConsistencyProfile(scores: {
  spiritual:           number
  physical:            number
  nutritional:         number
  personal:            number
  missional:           number
  focusPillarSelected: PillarName | null
}): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: 'Not authenticated.' }

  const sb = createServerSupabaseClient()

  // 1 — Insert session row
  const { error: sessionErr } = await sb
    .from('consistency_profile_sessions')
    .insert({
      user_id:               userId,
      spiritual_score:       scores.spiritual,
      physical_score:        scores.physical,
      nutritional_score:     scores.nutritional,
      personal_score:        scores.personal,
      missional_score:       scores.missional,
      focus_pillar_selected: scores.focusPillarSelected,
    })

  if (sessionErr) {
    console.error('saveConsistencyProfile session:', sessionErr)
    return { success: false, error: 'Failed to save profile session.' }
  }

  // 2 — Upsert pillar_levels (one row per pillar)
  const pillars: PillarName[] = ['spiritual', 'physical', 'nutritional', 'personal', 'missional']
  const pillarRows = pillars.map((pillar) => {
    const score = scores[pillar]
    const level = scoreToLevel(score)
    return {
      user_id:         userId,
      pillar,
      level,
      operating_state: resolveOperatingState(level),
      profile_score:   score,
      gauge_score:     null as number | null,
      assessed_at:     new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    }
  })

  const { error: pillarErr } = await sb
    .from('pillar_levels')
    .upsert(pillarRows, { onConflict: 'user_id,pillar' })

  if (pillarErr) {
    console.error('saveConsistencyProfile pillar_levels:', pillarErr)
    return { success: false, error: 'Failed to save pillar levels.' }
  }

  // 3 — Mark profile complete on user_profile
  const { error: profileErr } = await sb
    .from('user_profile')
    .update({
      consistency_profile_completed: true,
      updated_at:                    new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (profileErr) {
    console.error('saveConsistencyProfile user_profile:', profileErr)
    return { success: false, error: 'Failed to update profile.' }
  }

  revalidatePath('/consistency-profile')
  revalidatePath('/onboarding')
  return { success: true }
}

export async function saveFocusPillar(
  focusPillar: PillarName
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: 'Not authenticated.' }

  const sb = createServerSupabaseClient()

  const { data: session, error: fetchErr } = await sb
    .from('consistency_profile_sessions')
    .select('id')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchErr || !session) {
    return { success: false, error: 'No profile session found.' }
  }

  const { error: updateErr } = await sb
    .from('consistency_profile_sessions')
    .update({ focus_pillar_selected: focusPillar })
    .eq('id', session.id)

  if (updateErr) {
    console.error('saveFocusPillar:', updateErr)
    return { success: false, error: 'Failed to save focus pillar.' }
  }

  revalidatePath('/consistency-profile/portrait')
  return { success: true }
}

// ─── Soloing onboarding (Phase 6 — Step 51) ───────────────────────────────────

export async function completeSoloingOnboarding(data: {
  durationDays: 90 | 100
  pillarGoals:  Record<string, string>
  allPillars:   string[]
}): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb    = createServerSupabaseClient()
  const start = todayStr()

  const startDt = new Date(start + 'T00:00:00')
  startDt.setDate(startDt.getDate() + data.durationDays - 1)
  const end = new Intl.DateTimeFormat('en-CA').format(startDt)

  // Build pillar_level_snapshot from current pillar_levels rows
  const { data: pillarRows } = await sb
    .from('pillar_levels')
    .select('pillar, level, operating_state')
    .eq('user_id', userId)

  const snapshot: Record<string, { level: number; state: string }> = {}
  for (const row of pillarRows ?? []) {
    snapshot[row.pillar] = {
      level: row.level as number,
      state: (row.operating_state as string) || resolveOperatingState(row.level as number),
    }
  }

  const { error: challengeErr } = await sb
    .from('challenges')
    .insert({
      user_id:               userId,
      level:                 4,
      duration_days:         data.durationDays,
      start_date:            start,
      end_date:              end,
      status:                'active',
      pillar_goals:          data.pillarGoals,
      pillar_level_snapshot: snapshot,
    })

  if (challengeErr) throw new Error(`completeSoloingOnboarding challenge: ${challengeErr.message}`)

  revalidatePath('/')
  revalidatePath('/soloing')
}

// ─── Soloing completion navigation (Phase 6 — Step 53) ────────────────────────

// Start a new Soloing challenge, copying duration and goals from the completed one.
// Used when the user is non-eligible for Orchestrating and wants to go again.
export async function startSoloingAgain(completedChallengeId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()

  // Fetch the completed challenge to carry forward its shape
  const { data: prev, error: fetchErr } = await sb
    .from('challenges')
    .select('pillar_goals, duration_days')
    .eq('id', completedChallengeId)
    .eq('user_id', userId)
    .single()
  if (fetchErr || !prev) throw new Error('startSoloingAgain: could not load previous challenge')

  const start  = todayStr()
  const startD = new Date(start + 'T00:00:00')
  startD.setDate(startD.getDate() + (prev.duration_days - 1))
  const end = new Intl.DateTimeFormat('en-CA').format(startD)

  // Fetch current pillar_levels to rebuild pillar_level_snapshot
  const { data: pillarRows } = await sb
    .from('pillar_levels')
    .select('pillar, level, operating_state')
    .eq('user_id', userId)

  const snapshot: Record<string, { level: number; state: string }> = {}
  for (const row of pillarRows ?? []) {
    snapshot[row.pillar] = {
      level: row.level as number,
      state: (row.operating_state as string) || resolveOperatingState(row.level as number),
    }
  }

  const { error: challengeErr } = await sb
    .from('challenges')
    .insert({
      user_id:               userId,
      level:                 4,
      duration_days:         prev.duration_days,
      start_date:            start,
      end_date:              end,
      status:                'active',
      pillar_goals:          prev.pillar_goals,
      pillar_level_snapshot: snapshot,
    })
  if (challengeErr) throw new Error(`startSoloingAgain insert: ${challengeErr.message}`)

  revalidatePath('/')
  revalidatePath('/soloing')
}
