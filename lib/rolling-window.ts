// =============================================================================
// Rolling Window Advancement Engine
//
// Evaluates per-pillar advancement thresholds on every pillar save.
// Called from the /api/checkin route after a pillar entry is written.
//
// Rules (source of truth: ROLLING_WINDOW_THRESHOLDS in constants.ts):
//   Tuning (1)  → Jamming (2):  4 completions in last 7 calendar days
//   Jamming (2) → Grooving (3): 10 completions in last 14 calendar days
//   Grooving (3)→ Soloing (4):  48 completions in last 60 calendar days
//
// The window is a strict sliding window: only entries within the last N
// calendar days count. An entry from day 8 is not in a 7-day window ending today.
//
// A pillar at Level 4 (Soloing) has no further advancement — evaluateWindow
// returns shouldAdvance: false and nextLevel: null for it.
// =============================================================================

import type { PillarDailyEntry, PillarName, LevelNumber, RollingWindowResult } from '@/lib/types'
import { ROLLING_WINDOW_THRESHOLDS } from '@/lib/constants'
import { todayStr } from '@/lib/constants'

// Returns the ISO date string for N days ago from a reference date.
function daysAgo(n: number, from?: string): string {
  const d = new Date((from ?? todayStr()) + 'T00:00:00')
  d.setDate(d.getDate() - n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

// Core function: evaluates one pillar's rolling window against its threshold.
//
// entries: all PillarDailyEntry rows for this pillar (any date range — function filters)
// level:   the pillar's current level
// pillar:  the pillar name (for the result object)
// today:   the reference date (YYYY-MM-DD) — use todayInTz(tz) in server contexts
//
// Returns a RollingWindowResult describing whether advancement should fire.
export function evaluateRollingWindow(
  entries:  PillarDailyEntry[],
  level:    LevelNumber,
  pillar:   PillarName,
  today:    string,
): RollingWindowResult {
  const threshold = ROLLING_WINDOW_THRESHOLDS[level]

  // Level 4 (Soloing) has no advancement threshold
  if (!threshold) {
    return {
      pillar,
      currentLevel:  level,
      completions:   0,
      windowDays:    0,
      required:      0,
      shouldAdvance: false,
      nextLevel:     null,
    }
  }

  const { windowDays, required, nextLevel } = threshold
  const reference = today
  const windowStart = daysAgo(windowDays - 1, reference)

  // Count completed entries within the rolling window
  const completions = entries.filter(e =>
    e.completed &&
    e.entry_date >= windowStart &&
    e.entry_date <= reference
  ).length

  return {
    pillar,
    currentLevel:  level,
    completions,
    windowDays,
    required,
    shouldAdvance: completions >= required,
    nextLevel:     completions >= required ? nextLevel : null,
  }
}

// Convenience: evaluate all active pillars at once.
// entriesByPillar: a map of pillar name → that pillar's entries
// levelByPillar:   a map of pillar name → current level
// Returns one RollingWindowResult per pillar.
export function evaluateAllPillars(
  entriesByPillar: Partial<Record<PillarName, PillarDailyEntry[]>>,
  levelByPillar:   Partial<Record<PillarName, LevelNumber>>,
  today:           string,
): RollingWindowResult[] {
  const results: RollingWindowResult[] = []

  for (const [pillar, entries] of Object.entries(entriesByPillar)) {
    const p = pillar as PillarName
    const level = levelByPillar[p]
    if (!level || !entries) continue
    results.push(evaluateRollingWindow(entries, level, p, today))
  }

  return results
}

// Returns the last N entries for a pillar sorted oldest → newest.
// Used to build the rolling window dot visualization inside pillar cards.
export function getWindowEntries(
  entries:    PillarDailyEntry[],
  windowDays: number,
  today:      string,
): PillarDailyEntry[] {
  const reference = today
  const windowStart = daysAgo(windowDays - 1, reference)

  return entries
    .filter(e => e.entry_date >= windowStart && e.entry_date <= reference)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
}
