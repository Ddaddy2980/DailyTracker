// =============================================================================
// Consistency Gauge Engine — Step 39
//
// Pure calculation functions. No Supabase, no side effects.
// All inputs and outputs are plain values — fully testable in isolation.
//
// Gauge score: 0–100 integer.
// null = no data yet (first calendar week has not closed).
//
// Calendar week definition: Monday 00:00 UTC → Sunday 23:59 UTC.
// =============================================================================

import type { PillarName } from './types'

// Column name in daily_entries for each pillar
const PILLAR_COL: Record<PillarName, string> = {
  spiritual:   'spiritual',
  physical:    'physical_goals',
  nutritional: 'nutritional',
  personal:    'personal',
  missional:   'missional',
}

// A daily_entries row shape used by this engine.
// Only the completion columns and the date are needed.
export interface GaugeEntryRow {
  entry_date:    string                          // ISO date e.g. '2026-04-07'
  spiritual:     Record<string, unknown> | null
  physical_goals: Record<string, unknown> | null
  nutritional:   Record<string, unknown> | null
  personal:      Record<string, unknown> | null
  missional:     Record<string, unknown> | null
}

// Returns the ISO date string (YYYY-MM-DD) for the Monday of the week
// that contains the given date.  Works in UTC.
export function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()                      // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day          // offset to Monday
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

// Returns the ISO date string (YYYY-MM-DD) for the Sunday of the week
// that contains the given date.
export function getSundayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  const diff = day === 0 ? 0 : 7 - day           // offset to Sunday
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

// Returns true if the given entry row records a completion for this pillar.
// Completion is defined as the JSONB column containing { challenge_complete: true }.
export function isPillarComplete(row: GaugeEntryRow, pillar: PillarName): boolean {
  const col = PILLAR_COL[pillar] as keyof GaugeEntryRow
  const val = row[col] as Record<string, unknown> | null
  return val?.challenge_complete === true
}

// Calculates the completion percentage (0–100) for a pillar within a date range
// (inclusive on both ends).  Days with no entry row count as missed.
//
// weekDays: the total number of days in the range (the denominator).
// Returns 0 if weekDays is 0 to avoid division by zero.
export function calcWeeklyPillarPct(
  entries:   GaugeEntryRow[],
  pillar:    PillarName,
  weekStart: string,    // ISO date — Monday
  weekEnd:   string,    // ISO date — Sunday (or today for the current week)
): number {
  const start = new Date(weekStart + 'T00:00:00Z').getTime()
  const end   = new Date(weekEnd   + 'T00:00:00Z').getTime()

  // Total days in the range (denominator)
  const totalDays = Math.round((end - start) / 86_400_000) + 1
  if (totalDays <= 0) return 0

  // Build a Set of dates with a completed entry for quick lookup
  const completedDates = new Set<string>()
  for (const row of entries) {
    const rowMs = new Date(row.entry_date + 'T00:00:00Z').getTime()
    if (rowMs >= start && rowMs <= end && isPillarComplete(row, pillar)) {
      completedDates.add(row.entry_date)
    }
  }

  return Math.round((completedDates.size / totalDays) * 100)
}

// Calculates a rolling weighted average of an array of week percentages.
// The array is ordered oldest → newest. The newest week receives the highest weight.
// Weight scheme: linear — week[0] gets weight 1, week[1] gets weight 2, etc.
//
// Returns 0 if the array is empty.
export function calcRollingWeightedAvg(weeklyPcts: number[]): number {
  if (weeklyPcts.length === 0) return 0

  let weightedSum = 0
  let totalWeight = 0

  for (let i = 0; i < weeklyPcts.length; i++) {
    const weight  = i + 1          // 1-based: oldest=1, newest=N
    weightedSum  += weeklyPcts[i] * weight
    totalWeight  += weight
  }

  return Math.round(weightedSum / totalWeight)
}

// Combines current-week live performance with a rolling weighted average of
// prior closed weeks into a single gauge score (0–100).
//
// Rules:
//   - Returns null if priorWeekPcts is empty — no closed week yet, no score.
//   - Once at least one full week has closed: score is live.
//   - Blend: 60% rolling history + 40% current week.
//
// priorWeekPcts: array ordered oldest → newest of all fully-closed weeks.
// currentWeekPct: the in-progress week (partial data, 0–100).
export function calcGaugeScore(
  currentWeekPct: number,
  priorWeekPcts:  number[],
): number | null {
  if (priorWeekPcts.length === 0) return null

  const rollingAvg = calcRollingWeightedAvg(priorWeekPcts)
  const blended    = rollingAvg * 0.6 + currentWeekPct * 0.4

  return Math.round(blended)
}

// Calculates the Life on Purpose Score: simple average of all five pillar
// gauge scores that are non-null.
//
// Returns null if fewer than five pillars have a non-null gauge score.
// (Per spec: score shown only when all five pillars are active.)
export function calcLifeOnPurposeScore(
  gaugeScores: Record<PillarName, number | null>,
): number | null {
  const values = Object.values(gaugeScores).filter((v): v is number => v !== null)
  if (values.length < 5) return null

  const sum = values.reduce((acc, v) => acc + v, 0)
  return Math.round(sum / values.length)
}

// =============================================================================
// High-level entry point — called by the API route.
//
// Given all daily_entries rows for a user (from challenge start to today),
// and today's date, this function returns:
//   - gaugeScore per pillar (null if first week hasn't closed)
//   - lifeOnPurposeScore (null unless all five pillar gauges are non-null)
// =============================================================================

export interface GaugeResult {
  pillar:              PillarName
  gaugeScore:          number | null
  currentWeekPct:      number
  priorWeekPcts:       number[]
}

// Derives the ordered list of closed calendar weeks that fall entirely
// on or before the last Sunday before today.
//
// A week is "closed" if its Sunday has already passed (< today).
// Returns weeks ordered oldest → newest.
function getClosedWeeks(challengeStart: string, today: string): Array<{ start: string; end: string }> {
  const weeks: Array<{ start: string; end: string }> = []

  // Find Monday of the week containing challengeStart
  let cursor = getMondayOfWeek(challengeStart)
  const todayMs = new Date(today + 'T00:00:00Z').getTime()

  while (true) {
    const sunday   = getSundayOfWeek(cursor)
    const sundayMs = new Date(sunday + 'T00:00:00Z').getTime()

    // Only include weeks whose Sunday has already passed (fully closed)
    if (sundayMs >= todayMs) break

    weeks.push({ start: cursor, end: sunday })

    // Advance to next Monday
    const next = new Date(cursor + 'T00:00:00Z')
    next.setUTCDate(next.getUTCDate() + 7)
    cursor = next.toISOString().slice(0, 10)
  }

  return weeks
}

// Returns the start and end of the current (in-progress) calendar week.
// weekEnd is capped at today — we only count days that have passed.
function getCurrentWeekRange(today: string): { start: string; end: string } {
  return {
    start: getMondayOfWeek(today),
    end:   today,
  }
}

export function calcAllPillarGauges(
  entries:        GaugeEntryRow[],
  activePillars:  PillarName[],
  challengeStart: string,
  today:          string,
): GaugeResult[] {
  const closedWeeks    = getClosedWeeks(challengeStart, today)
  const currentWeekRng = getCurrentWeekRange(today)

  return activePillars.map((pillar): GaugeResult => {
    const priorWeekPcts = closedWeeks.map(w =>
      calcWeeklyPillarPct(entries, pillar, w.start, w.end)
    )

    const currentWeekPct = calcWeeklyPillarPct(
      entries,
      pillar,
      currentWeekRng.start,
      currentWeekRng.end,
    )

    const gaugeScore = calcGaugeScore(currentWeekPct, priorWeekPcts)

    return { pillar, gaugeScore, currentWeekPct, priorWeekPcts }
  })
}
