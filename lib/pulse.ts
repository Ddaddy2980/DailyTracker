// =============================================================================
// lib/pulse.ts
// Computes the challenge health signal (PulseState) from recent pillar entries.
//
// Formula: count distinct days in the last 7 calendar days (ending at fromDate)
// where at least one pillar entry has completed = true.
//
//   5–7 active days → smooth_sailing
//   3–4 active days → rough_waters
//   0–2 active days → taking_on_water
//
// Used in: /api/checkin (writes to challenges.pulse_state after every today save)
// =============================================================================

import type { PillarDailyEntry, PulseState } from '@/lib/types'
import { rollingWindowDates } from '@/lib/constants'

export function computePulseState(
  entries: Pick<PillarDailyEntry, 'entry_date' | 'completed'>[],
  fromDate: string
): PulseState {
  const windowDates = new Set(rollingWindowDates(7, fromDate))

  // Count distinct dates within the 7-day window where any pillar was completed
  const activeDays = new Set(
    entries
      .filter((e) => windowDates.has(e.entry_date) && e.completed)
      .map((e) => e.entry_date)
  ).size

  if (activeDays >= 5) return 'smooth_sailing'
  if (activeDays >= 3) return 'rough_waters'
  return 'taking_on_water'
}
