// =============================================================================
// lib/streaks.ts — v4 Streaks & Grace engine
//
// Model (PRODUCT.md §v4.1):
//   - Main streak: consecutive days where every required pillar (active pillar
//     with >= 1 active duration goal) was completed. Grace-protected.
//   - Grace: 1 earned per GRACE_EARN_INTERVAL consecutive main-streak days,
//     bank capped at GRACE_BANK_CAP. A missed day silently consumes one
//     (streak holds, does not increment); with no grace the streak resets.
//   - Pillar streaks: honest mirror — consecutive completed days per pillar,
//     no grace, cross-challenge. Computed, never stored.
//   - Life Pause days are neutral: neither complete nor missed.
//
// Storage:
//   - streak_state (1 row/user): walk cache through *yesterday* only. The
//     displayed main streak adds +1 live when today is sealed.
//   - daily_summary (1 row/user/day): written when a day is evaluated.
//     `main_complete`/`grace_used`/`paused` are streak-semantic flags frozen
//     at evaluation time (except the yesterday-backfill window). Edits older
//     than yesterday update `pillars_completed` only — they can never
//     resurrect a broken streak by construction.
//
// Evaluation is lazy — no cron. evaluatePendingDays runs on dashboard load,
// at the top of /api/checkin, and inside /api/challenges/resume BEFORE the
// pause flips off (so days inside the pause window classify as paused).
// =============================================================================

import { createServerSupabaseClient } from '@/lib/supabase'
import {
  addDays,
  todayInTz,
  GRACE_EARN_INTERVAL,
  GRACE_BANK_CAP,
  STREAK_WALK_LIMIT_DAYS,
} from '@/lib/constants'
import type { PillarName, DayClass, StreakState, DailySummary } from '@/lib/types'

type Supabase = ReturnType<typeof createServerSupabaseClient>

// Mutable core of streak_state used by the pure day-transition function
export interface StreakCore {
  main_streak:                 number
  longest_main_streak:         number
  grace_bank:                  number
  last_grace_earned_at_streak: number
}

export interface ApplyDayResult {
  state:         StreakCore
  graceConsumed: boolean
  graceEarned:   boolean
  streakBroke:   boolean
}

export interface EvaluationResult {
  state:                 StreakState
  graceCoveredYesterday: boolean   // Tempo: "Grace covered yesterday — your streak holds."
  streakBrokeInWindow:   boolean   // Tempo: comeback morning line
}

// Fields consumed by the backward streak walk
type SummarySlice = Pick<DailySummary, 'summary_date' | 'main_complete' | 'grace_used' | 'paused'>

// Pause-relevant slice of the active challenge (null when no active challenge)
interface PauseContext {
  is_paused:            boolean
  paused_at:            string | null
  scheduled_pause_date: string | null
}


// =============================================================================
// Pure core
// =============================================================================

export function classifyDay(
  requiredCount: number,
  completedCount: number,
  isPaused: boolean
): DayClass {
  if (isPaused) return 'paused'
  // No goal-bearing active pillars — the day is neutral, never a phantom miss
  if (requiredCount === 0) return 'paused'
  return completedCount >= requiredCount ? 'complete' : 'missed'
}

// Applies one evaluated day to the streak state. Pure — returns a new object.
export function applyDay(state: StreakCore, cls: DayClass): ApplyDayResult {
  const next = { ...state }
  let graceConsumed = false
  let graceEarned = false
  let streakBroke = false

  if (cls === 'complete') {
    next.main_streak += 1
    if (next.main_streak > next.longest_main_streak) {
      next.longest_main_streak = next.main_streak
    }
    if (
      next.main_streak % GRACE_EARN_INTERVAL === 0 &&
      next.main_streak > next.last_grace_earned_at_streak
    ) {
      // Record the earn moment even when the bank is full — a full bank
      // forfeits the earn; it is not banked retroactively after a consume.
      next.last_grace_earned_at_streak = next.main_streak
      if (next.grace_bank < GRACE_BANK_CAP) {
        next.grace_bank += 1
        graceEarned = true
      }
    }
  } else if (cls === 'missed') {
    if (next.grace_bank > 0) {
      next.grace_bank -= 1
      graceConsumed = true
      // Streak holds but does not increment
    } else {
      next.main_streak = 0
      next.last_grace_earned_at_streak = 0
      streakBroke = true
    }
  }
  // 'paused' — no-op

  return { state: next, graceConsumed, graceEarned, streakBroke }
}

// Recomputes the main streak by walking daily_summary rows backwards from
// endDate. A missing row breaks the walk (that day was never evaluated as
// part of an unbroken run). grace_used and paused days are skipped without
// counting — matching applyDay semantics exactly.
export function computeMainStreakFromSummaries(
  rows: SummarySlice[],
  endDate: string
): number {
  const byDate = new Map(rows.map((r) => [r.summary_date, r]))
  let expected = endDate
  let streak = 0
  for (let i = 0; i < STREAK_WALK_LIMIT_DAYS; i++) {
    const row = byDate.get(expected)
    if (!row) break
    if (row.paused || row.grace_used) {
      expected = addDays(expected, -1)
      continue
    }
    if (!row.main_complete) break
    streak += 1
    expected = addDays(expected, -1)
  }
  return streak
}

function isPausedOnDay(challenge: PauseContext | null, date: string): boolean {
  if (!challenge) return false
  if (challenge.is_paused && challenge.paused_at && date >= challenge.paused_at.slice(0, 10)) {
    return true
  }
  // Covers a scheduled pause that has arrived but whose auto-activation
  // (dashboard load) hasn't run yet
  if (challenge.scheduled_pause_date && date >= challenge.scheduled_pause_date) {
    return true
  }
  return false
}


// =============================================================================
// Context fetch — required pillars + pause-relevant challenge slice
// =============================================================================

interface StreakContext {
  requiredPillars: PillarName[]
  challenge:       PauseContext | null
}

async function fetchStreakContext(userId: string, supabase: Supabase): Promise<StreakContext> {
  const [profileResult, levelsResult, goalsResult] = await Promise.all([
    supabase
      .from('user_profile')
      .select('active_challenge_id')
      .eq('user_id', userId)
      .single<{ active_challenge_id: string | null }>(),
    supabase
      .from('pillar_levels')
      .select('pillar, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .returns<{ pillar: PillarName; is_active: boolean }[]>(),
    supabase
      .from('duration_goals')
      .select('pillar')
      .eq('user_id', userId)
      .eq('is_active', true)
      .returns<{ pillar: PillarName }[]>(),
  ])

  const goalPillars = new Set((goalsResult.data ?? []).map((g) => g.pillar))
  const requiredPillars = (levelsResult.data ?? [])
    .map((l) => l.pillar)
    .filter((p) => goalPillars.has(p))

  let challenge: PauseContext | null = null
  const challengeId = profileResult.data?.active_challenge_id
  if (challengeId) {
    const { data } = await supabase
      .from('challenges')
      .select('is_paused, paused_at, scheduled_pause_date, status')
      .eq('id', challengeId)
      .eq('user_id', userId)
      .single<PauseContext & { status: string }>()
    if (data && data.status === 'active') challenge = data
  }

  return { requiredPillars, challenge }
}

// Builds a Map of entry_date → Set of pillars with completed = true
function completedPillarsByDate(
  entries: { pillar: PillarName; entry_date: string }[]
): Map<string, Set<PillarName>> {
  const map = new Map<string, Set<PillarName>>()
  for (const e of entries) {
    const set = map.get(e.entry_date) ?? new Set<PillarName>()
    set.add(e.pillar)
    map.set(e.entry_date, set)
  }
  return map
}


// =============================================================================
// evaluatePendingDays — folds every day in (last_evaluated_date, yesterday]
// into streak_state and writes daily_summary rows. Idempotent; safe to call
// from multiple entry points. Fast path is a single SELECT.
// =============================================================================

// Gaps longer than this are processed as: reset (a >60-day unpaused gap always
// drains grace and breaks the streak — max pause is 14 days), then evaluate
// only the most recent window. Bounds work for long-lapsed users.
const MAX_PENDING_WINDOW_DAYS = 60

export async function evaluatePendingDays(
  userId: string,
  tz: string | undefined,
  supabase: Supabase
): Promise<EvaluationResult> {
  const today = todayInTz(tz)
  const yesterday = addDays(today, -1)

  const { data: existing } = await supabase
    .from('streak_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<StreakState>()

  if (!existing) {
    return bootstrapStreakState(userId, yesterday, supabase)
  }

  // Fast path — nothing pending
  if (existing.last_evaluated_date >= yesterday) {
    return { state: existing, graceCoveredYesterday: false, streakBrokeInWindow: false }
  }

  const { requiredPillars, challenge } = await fetchStreakContext(userId, supabase)

  // Bound the window for long-lapsed users
  let core: StreakCore = {
    main_streak:                 existing.main_streak,
    longest_main_streak:         existing.longest_main_streak,
    grace_bank:                  existing.grace_bank,
    last_grace_earned_at_streak: existing.last_grace_earned_at_streak,
  }
  let windowStart = addDays(existing.last_evaluated_date, 1)
  let streakBrokeInWindow = false
  const boundedStart = addDays(yesterday, -(MAX_PENDING_WINDOW_DAYS - 1))
  if (windowStart < boundedStart) {
    windowStart = boundedStart
    if (core.main_streak > 0) streakBrokeInWindow = true
    core = { ...core, main_streak: 0, grace_bank: 0, last_grace_earned_at_streak: 0 }
  }

  const { data: entries } = await supabase
    .from('pillar_daily_entries')
    .select('pillar, entry_date')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('entry_date', windowStart)
    .lte('entry_date', yesterday)
    .returns<{ pillar: PillarName; entry_date: string }[]>()

  const completedByDate = completedPillarsByDate(entries ?? [])

  const summaryRows: Omit<DailySummary, 'id' | 'created_at' | 'updated_at'>[] = []
  let graceCoveredYesterday = false

  for (let d = windowStart; d <= yesterday; d = addDays(d, 1)) {
    const completedSet = completedByDate.get(d) ?? new Set<PillarName>()
    const completedCount = requiredPillars.filter((p) => completedSet.has(p)).length
    const paused = isPausedOnDay(challenge, d)
    const cls = classifyDay(requiredPillars.length, completedCount, paused)
    const result = applyDay(core, cls)
    core = result.state
    if (result.streakBroke) streakBrokeInWindow = true
    if (result.graceConsumed && d === yesterday) graceCoveredYesterday = true

    // Note: `paused` records BOTH Life-Pause days and zero-goal neutral days —
    // any day applyDay treated as a no-op must be skipped (not broken on) by
    // later backward walks, or the two disagree.
    summaryRows.push({
      user_id:           userId,
      summary_date:      d,
      pillars_required:  requiredPillars.length,
      pillars_completed: completedCount,
      main_complete:     cls === 'complete',
      grace_used:        result.graceConsumed,
      paused:            cls === 'paused',
    })
  }

  if (summaryRows.length > 0) {
    const { error: summaryError } = await supabase
      .from('daily_summary')
      .upsert(summaryRows, { onConflict: 'user_id,summary_date' })
    if (summaryError) {
      console.error('evaluatePendingDays: failed to upsert daily_summary rows:', summaryError)
    }
  }

  // Optimistic-guarded write — a concurrent evaluation that already advanced
  // last_evaluated_date wins; we discard and re-read.
  const { data: updated, error: updateError } = await supabase
    .from('streak_state')
    .update({
      main_streak:                 core.main_streak,
      longest_main_streak:         core.longest_main_streak,
      grace_bank:                  core.grace_bank,
      last_grace_earned_at_streak: core.last_grace_earned_at_streak,
      last_evaluated_date:         yesterday,
    })
    .eq('user_id', userId)
    .eq('last_evaluated_date', existing.last_evaluated_date)
    .select()
    .returns<StreakState[]>()

  if (updateError) {
    console.error('evaluatePendingDays: failed to update streak_state:', updateError)
  }

  if (!updated || updated.length === 0) {
    const { data: reread } = await supabase
      .from('streak_state')
      .select('*')
      .eq('user_id', userId)
      .single<StreakState>()
    return {
      state: reread ?? existing,
      graceCoveredYesterday: false,
      streakBrokeInWindow: false,
    }
  }

  return { state: updated[0], graceCoveredYesterday, streakBrokeInWindow }
}

// First-ever evaluation for this user: seed the streak from real entry history
// against the CURRENT required-pillar set (approximation — activation dates
// aren't tracked), so launch day feels earned rather than zeroed.
async function bootstrapStreakState(
  userId: string,
  yesterday: string,
  supabase: Supabase
): Promise<EvaluationResult> {
  const { requiredPillars } = await fetchStreakContext(userId, supabase)

  const { data: entries } = await supabase
    .from('pillar_daily_entries')
    .select('pillar, entry_date')
    .eq('user_id', userId)
    .eq('completed', true)
    .lte('entry_date', yesterday)
    .order('entry_date', { ascending: false })
    .limit(STREAK_WALK_LIMIT_DAYS * 5)
    .returns<{ pillar: PillarName; entry_date: string }[]>()

  const completedByDate = completedPillarsByDate(entries ?? [])

  let streak = 0
  const completeDays: string[] = []
  if (requiredPillars.length > 0) {
    let d = yesterday
    for (let i = 0; i < STREAK_WALK_LIMIT_DAYS; i++) {
      const set = completedByDate.get(d)
      const complete = set !== undefined && requiredPillars.every((p) => set.has(p))
      if (!complete) break
      streak += 1
      completeDays.push(d)
      d = addDays(d, -1)
    }
  }

  const seeded = {
    user_id:                     userId,
    main_streak:                 streak,
    longest_main_streak:         streak,
    grace_bank:                  Math.min(GRACE_BANK_CAP, Math.floor(streak / GRACE_EARN_INTERVAL)),
    last_grace_earned_at_streak: streak - (streak % GRACE_EARN_INTERVAL),
    last_evaluated_date:         yesterday,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('streak_state')
    .insert(seeded)
    .select()
    .single<StreakState>()

  if (insertError || !inserted) {
    // Likely a concurrent bootstrap won the insert race — read theirs
    const { data: reread } = await supabase
      .from('streak_state')
      .select('*')
      .eq('user_id', userId)
      .single<StreakState>()
    if (!reread) {
      console.error('bootstrapStreakState: insert and re-read both failed:', insertError)
      throw new Error('Failed to initialize streak state')
    }
    return { state: reread, graceCoveredYesterday: false, streakBrokeInWindow: false }
  }

  // Backfill daily_summary for the counted run so future backward walks
  // (reevaluateYesterday) see the same streak the bootstrap computed.
  if (completeDays.length > 0) {
    const rows = completeDays.map((d) => {
      const set = completedByDate.get(d) ?? new Set<PillarName>()
      return {
        user_id:           userId,
        summary_date:      d,
        pillars_required:  requiredPillars.length,
        pillars_completed: requiredPillars.filter((p) => set.has(p)).length,
        main_complete:     true,
        grace_used:        false,
        paused:            false,
      }
    })
    const { error: summaryError } = await supabase
      .from('daily_summary')
      .upsert(rows, { onConflict: 'user_id,summary_date' })
    if (summaryError) {
      console.error('bootstrapStreakState: failed to backfill daily_summary:', summaryError)
    }
  }

  return { state: inserted, graceCoveredYesterday: false, streakBrokeInWindow: false }
}


// =============================================================================
// reevaluateYesterday — called after a save with entry_date === yesterday.
// Yesterday is inside the editable streak window until midnight tonight:
// re-classify it, refund a provisionally-consumed grace day if the backfill
// completed it, and recompute the streak by walking daily_summary. A streak
// broken ONLY by yesterday is resurrected; older breaks stay broken.
// =============================================================================

export async function reevaluateYesterday(
  userId: string,
  tz: string | undefined,
  supabase: Supabase
): Promise<StreakState | null> {
  const today = todayInTz(tz)
  const yesterday = addDays(today, -1)

  const { data: state } = await supabase
    .from('streak_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<StreakState>()

  // Evaluator hasn't covered yesterday yet — nothing to re-do; the pending
  // evaluation will classify it correctly from the saved entries.
  if (!state || state.last_evaluated_date < yesterday) return state ?? null

  const { requiredPillars, challenge } = await fetchStreakContext(userId, supabase)

  const [{ data: oldRow }, { data: entries }] = await Promise.all([
    supabase
      .from('daily_summary')
      .select('summary_date, main_complete, grace_used, paused')
      .eq('user_id', userId)
      .eq('summary_date', yesterday)
      .maybeSingle<SummarySlice>(),
    supabase
      .from('pillar_daily_entries')
      .select('pillar, entry_date')
      .eq('user_id', userId)
      .eq('completed', true)
      .eq('entry_date', yesterday)
      .returns<{ pillar: PillarName; entry_date: string }[]>(),
  ])

  const completedSet = new Set((entries ?? []).map((e) => e.pillar))
  const completedCount = requiredPillars.filter((p) => completedSet.has(p)).length
  const paused = (oldRow?.paused ?? false) || isPausedOnDay(challenge, yesterday)
  const cls = classifyDay(requiredPillars.length, completedCount, paused)

  const wasGraceUsed = oldRow?.grace_used ?? false
  const nowComplete = cls === 'complete'

  const { error: summaryError } = await supabase
    .from('daily_summary')
    .upsert(
      {
        user_id:           userId,
        summary_date:      yesterday,
        pillars_required:  requiredPillars.length,
        pillars_completed: completedCount,
        main_complete:     nowComplete,
        grace_used:        wasGraceUsed && !nowComplete,
        paused:            cls === 'paused',
      },
      { onConflict: 'user_id,summary_date' }
    )
  if (summaryError) {
    console.error('reevaluateYesterday: failed to upsert daily_summary:', summaryError)
    return state
  }

  // Refund the grace day the overnight evaluator consumed for yesterday
  let graceBank = state.grace_bank
  if (wasGraceUsed && nowComplete) {
    graceBank = Math.min(GRACE_BANK_CAP, graceBank + 1)
  }

  // Recompute the streak from the (now updated) summary history
  const { data: summaries } = await supabase
    .from('daily_summary')
    .select('summary_date, main_complete, grace_used, paused')
    .eq('user_id', userId)
    .lte('summary_date', yesterday)
    .order('summary_date', { ascending: false })
    .limit(STREAK_WALK_LIMIT_DAYS)
    .returns<SummarySlice[]>()

  const mainStreak = computeMainStreakFromSummaries(summaries ?? [], yesterday)

  // Catch up any earn moment the recomputed streak crossed (bounded loop)
  let lastEarned = state.last_grace_earned_at_streak
  if (mainStreak < lastEarned) lastEarned = mainStreak - (mainStreak % GRACE_EARN_INTERVAL)
  while (lastEarned + GRACE_EARN_INTERVAL <= mainStreak) {
    lastEarned += GRACE_EARN_INTERVAL
    graceBank = Math.min(GRACE_BANK_CAP, graceBank + 1)
  }

  const { data: updated, error: updateError } = await supabase
    .from('streak_state')
    .update({
      main_streak:                 mainStreak,
      longest_main_streak:         Math.max(state.longest_main_streak, mainStreak),
      grace_bank:                  graceBank,
      last_grace_earned_at_streak: lastEarned,
    })
    .eq('user_id', userId)
    .eq('last_evaluated_date', state.last_evaluated_date)
    .select()
    .returns<StreakState[]>()

  if (updateError) {
    console.error('reevaluateYesterday: failed to update streak_state:', updateError)
  }
  return updated?.[0] ?? state
}


// =============================================================================
// updateHistoricalSummary — for saves older than yesterday. Updates the day's
// completion COUNTS for history accuracy (Journey page) but never touches
// main_complete / grace_used / paused, and never touches streak_state — a
// broken streak can never be resurrected by an old edit.
// =============================================================================

export async function updateHistoricalSummary(
  userId: string,
  date: string,
  supabase: Supabase
): Promise<void> {
  const { data: existing } = await supabase
    .from('daily_summary')
    .select('id, pillars_required')
    .eq('user_id', userId)
    .eq('summary_date', date)
    .maybeSingle<{ id: string; pillars_required: number }>()

  // Day was never evaluated (pre-v4 history) — leave it absent; the streak
  // walk treats missing rows as breaks, which is the conservative truth.
  if (!existing) return

  const { data: entries } = await supabase
    .from('pillar_daily_entries')
    .select('pillar')
    .eq('user_id', userId)
    .eq('completed', true)
    .eq('entry_date', date)
    .returns<{ pillar: PillarName }[]>()

  const completedCount = new Set((entries ?? []).map((e) => e.pillar)).size

  const { error } = await supabase
    .from('daily_summary')
    .update({ pillars_completed: completedCount })
    .eq('id', existing.id)

  if (error) {
    console.error('updateHistoricalSummary: failed to update daily_summary:', error)
  }
}


// =============================================================================
// computePillarStreaks — honest per-pillar streaks through endDate (usually
// yesterday; callers add +1 live when today's pillar is complete).
// Cross-challenge by design; paused days are skipped without counting.
// =============================================================================

export async function computePillarStreaks(
  userId: string,
  pillars: PillarName[],
  endDate: string,
  supabase: Supabase
): Promise<Record<PillarName, number>> {
  const result = {
    spiritual: 0, physical: 0, nutritional: 0, personal: 0, relational: 0,
  } as Record<PillarName, number>
  if (pillars.length === 0) return result

  const walkStart = addDays(endDate, -(STREAK_WALK_LIMIT_DAYS - 1))

  const [{ data: entries }, { data: pausedRows }] = await Promise.all([
    supabase
      .from('pillar_daily_entries')
      .select('pillar, entry_date, completed')
      .eq('user_id', userId)
      .in('pillar', pillars)
      .gte('entry_date', walkStart)
      .lte('entry_date', endDate)
      .returns<{ pillar: PillarName; entry_date: string; completed: boolean }[]>(),
    supabase
      .from('daily_summary')
      .select('summary_date')
      .eq('user_id', userId)
      .eq('paused', true)
      .gte('summary_date', walkStart)
      .lte('summary_date', endDate)
      .returns<{ summary_date: string }[]>(),
  ])

  const pausedDates = new Set((pausedRows ?? []).map((r) => r.summary_date))
  const entryIndex = new Map<string, boolean>()
  for (const e of entries ?? []) {
    entryIndex.set(`${e.pillar}|${e.entry_date}`, e.completed)
  }

  for (const pillar of pillars) {
    let d = endDate
    let streak = 0
    for (let i = 0; i < STREAK_WALK_LIMIT_DAYS; i++) {
      if (pausedDates.has(d)) {
        d = addDays(d, -1)
        continue
      }
      if (entryIndex.get(`${pillar}|${d}`) !== true) break
      streak += 1
      d = addDays(d, -1)
    }
    result[pillar] = streak
  }

  return result
}


// =============================================================================
// applyLiveGraceEarn — when today's seal pushes the display streak
// (main_streak + 1) onto a GRACE_EARN_INTERVAL multiple, bank the grace day
// immediately so the hero shows it today. Tomorrow's evaluator earn-check is
// idempotent via last_grace_earned_at_streak. Returns whether a day was banked.
// =============================================================================

export async function applyLiveGraceEarn(
  userId: string,
  displayStreak: number,
  supabase: Supabase
): Promise<boolean> {
  if (displayStreak <= 0 || displayStreak % GRACE_EARN_INTERVAL !== 0) return false

  const { data: state } = await supabase
    .from('streak_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<StreakState>()

  if (!state || displayStreak <= state.last_grace_earned_at_streak) return false

  const { data: updated, error } = await supabase
    .from('streak_state')
    .update({
      grace_bank:                  Math.min(GRACE_BANK_CAP, state.grace_bank + 1),
      last_grace_earned_at_streak: displayStreak,
    })
    .eq('user_id', userId)
    .eq('last_grace_earned_at_streak', state.last_grace_earned_at_streak)
    .select()
    .returns<StreakState[]>()

  if (error) {
    console.error('applyLiveGraceEarn: failed to update streak_state:', error)
    return false
  }
  // banked only when the guarded write landed AND the bank had room
  return (updated?.length ?? 0) > 0 && state.grace_bank < GRACE_BANK_CAP
}
