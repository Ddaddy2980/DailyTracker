// =============================================================================
// Grooving Level — Milestone detection engine
// Server-side only. Never import in client components.
// =============================================================================

import { createServerSupabaseClient } from '@/lib/supabase'
import { todayStr } from '@/lib/constants'

// ── Types ─────────────────────────────────────────────────────────────────────

export type RootedMilestoneResult =
  | { fired: true;  goalName: string; pillar: string; completionCount: number }
  | { fired: false; reason: string }

// Shape of a single daily_entries row (only the columns we need)
export interface MilestoneEntry {
  entry_date:     string
  spiritual:      Record<string, unknown>
  physical_goals: Record<string, unknown>
  nutritional:    Record<string, unknown>
  personal:       Record<string, unknown>
}

// All data the pure detection function needs — no DB access inside
export interface MilestoneInput {
  challengeLevel:         number
  challengeStatus:        string
  challengeStartDate:     string
  pillarGoals:            Record<string, unknown>
  carriedForwardPillars:  string[]
  dayNumber:              number                // 1-based, derived from startDate + today
  rootedMilestoneFired:   boolean
  entries:                MilestoneEntry[]
  today:                  string                // YYYY-MM-DD
}

interface CandidateGoal {
  pillar:          string
  goalName:        string
  completionCount: number
  missedCount:     number
}

// ── Helpers (shared by pure function and DB wrapper) ──────────────────────────

export function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

function calcDayNumber(startDate: string, today: string): number {
  const startMs = new Date(startDate + 'T00:00:00').getTime()
  const todayMs = new Date(today   + 'T00:00:00').getTime()
  return Math.max(1, Math.floor((todayMs - startMs) / 86_400_000) + 1)
}

const PILLAR_COL: Record<string, string> = {
  spiritual:   'spiritual',
  physical:    'physical_goals',
  nutritional: 'nutritional',
  personal:    'personal',
}

function isPillarComplete(entry: MilestoneEntry, pillar: string): boolean {
  const col  = PILLAR_COL[pillar]
  if (!col) return false
  const cell = (entry as unknown as Record<string, unknown>)[col] as Record<string, unknown> | undefined
  return cell?.challenge_complete === true
}

// ── Pure detection function (exported for test harness) ───────────────────────

/**
 * evaluateRootedMilestone
 *
 * Pure function — no DB access, no side effects.
 * Takes all needed data as input, returns the milestone result.
 * Used directly by the test harness; called by checkRootedMilestone after DB fetch.
 */
export function evaluateRootedMilestone(input: MilestoneInput): RootedMilestoneResult {
  const {
    challengeLevel, challengeStatus, challengeStartDate,
    pillarGoals, carriedForwardPillars,
    dayNumber, rootedMilestoneFired, entries,
  } = input

  // Guard 1: must be Level 3
  if (challengeLevel !== 3) {
    return { fired: false, reason: 'not_grooving_level' }
  }

  // Guard 2: must be active
  if (challengeStatus !== 'active') {
    return { fired: false, reason: 'challenge_not_active' }
  }

  // Guard 3: day window 40–50
  if (dayNumber < 40 || dayNumber > 50) {
    return { fired: false, reason: `day_out_of_window:${dayNumber}` }
  }

  // Guard 4: milestone not already fired
  if (rootedMilestoneFired) {
    return { fired: false, reason: 'already_fired' }
  }

  // Build an O(1) lookup for entries by date
  const entryMap = new Map<string, MilestoneEntry>(
    entries.map(e => [e.entry_date, e])
  )
  const pastDays = dayNumber  // today's check-in is already saved

  // Evaluate each carried-forward pillar goal
  const candidates: CandidateGoal[] = []

  for (const [pillar, rawGoal] of Object.entries(pillarGoals)) {
    const goalName = String(rawGoal)

    // Condition 5: must be a carried-forward goal (column check — no text comparison)
    if (!carriedForwardPillars.includes(pillar)) continue

    let completionCount = 0
    for (let i = 0; i < pastDays; i++) {
      const date  = addDaysStr(challengeStartDate, i)
      const entry = entryMap.get(date)
      if (entry && isPillarComplete(entry, pillar)) completionCount++
    }
    const missedCount = pastDays - completionCount

    // Condition 4: 40+ completions AND at most 3 missed days total
    if (completionCount >= 40 && missedCount <= 3) {
      candidates.push({ pillar, goalName, completionCount, missedCount })
    }
  }

  if (candidates.length === 0) {
    return { fired: false, reason: 'no_qualifying_goals' }
  }

  // Tiebreak: highest completion count wins
  candidates.sort((a, b) => b.completionCount - a.completionCount)
  const winner = candidates[0]

  return {
    fired:           true,
    goalName:        winner.goalName,
    pillar:          winner.pillar,
    completionCount: winner.completionCount,
  }
}

// ── DB wrapper ────────────────────────────────────────────────────────────────

/**
 * checkRootedMilestone
 *
 * Fetches all needed data from the DB, calls evaluateRootedMilestone,
 * then writes side effects if the milestone fired.
 *
 * Side effects when fired:
 *  - Inserts a row into `rewards` (reward_type = 'rooted_badge')
 *  - Sets user_profile.rooted_milestone_fired = true
 *  - Sets user_profile.rooted_milestone_date  = today  (also the G5 video queue signal)
 *  - Sets user_profile.rooted_goal_id         = winning pillar key
 */
export async function checkRootedMilestone(
  userId:      string,
  challengeId: string,
): Promise<RootedMilestoneResult> {
  const sb    = createServerSupabaseClient()
  const today = todayStr()

  // Fetch challenge
  const { data: challenge, error: challengeErr } = await sb
    .from('challenges')
    .select('id, user_id, level, start_date, end_date, status, pillar_goals, carried_forward_pillars')
    .eq('id', challengeId)
    .eq('user_id', userId)
    .single()

  if (challengeErr || !challenge) {
    return { fired: false, reason: 'challenge_not_found' }
  }

  // Fetch profile (rooted_milestone_fired guard)
  const { data: profile, error: profileErr } = await sb
    .from('user_profile')
    .select('rooted_milestone_fired')
    .eq('user_id', userId)
    .single()

  if (profileErr || !profile) {
    return { fired: false, reason: 'profile_not_found' }
  }

  // Fetch daily entries for the challenge window
  const { data: entries, error: entriesErr } = await sb
    .from('daily_entries')
    .select('entry_date, spiritual, physical_goals, nutritional, personal')
    .eq('user_id', userId)
    .gte('entry_date', challenge.start_date)
    .lte('entry_date', today)
    .order('entry_date', { ascending: true })

  if (entriesErr) {
    return { fired: false, reason: 'entries_fetch_error' }
  }

  // Run pure detection
  const result = evaluateRootedMilestone({
    challengeLevel:        challenge.level as number,
    challengeStatus:       challenge.status as string,
    challengeStartDate:    challenge.start_date as string,
    pillarGoals:           challenge.pillar_goals as Record<string, unknown>,
    carriedForwardPillars: (challenge.carried_forward_pillars ?? []) as string[],
    dayNumber:             calcDayNumber(challenge.start_date as string, today),
    rootedMilestoneFired:  profile.rooted_milestone_fired === true,
    entries:               (entries ?? []) as MilestoneEntry[],
    today,
  })

  // Write side effects only if fired
  if (result.fired) {
    await sb.from('rewards').insert({
      user_id:      userId,
      challenge_id: challengeId,
      reward_type:  'rooted_badge',
      earned_at:    new Date().toISOString(),
    })

    await sb
      .from('user_profile')
      .update({
        rooted_milestone_fired: true,
        rooted_milestone_date:  today,
        rooted_goal_id:         result.pillar,
        updated_at:             new Date().toISOString(),
      })
      .eq('user_id', userId)
  }

  return result
}
