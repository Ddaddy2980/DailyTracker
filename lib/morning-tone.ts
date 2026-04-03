// =============================================================================
// Morning Tone Engine — Step 42
//
// Pure functions only. No Supabase, no side effects.
// Determines the morning notification tone from a user's active pillar mix.
//
// Three tones (per PRODUCT.md):
//   motivational — any active pillar is Building (level 1 / Tuning)
//   coaching     — all active pillars are Developing (levels 2–3)
//   reflective   — all active pillars are Anchored (levels 4–5)
//
// Dormant pillars (no row in pillar_levels) are ignored. Classification is
// based on active pillars only.
//
// Fallback: empty pillar_levels array → 'motivational'.
// =============================================================================

import { resolveOperatingState } from './pillar-state'
import type { PillarLevel } from './types'

export type MorningTone = 'motivational' | 'coaching' | 'reflective'

export interface MorningToneResult {
  tone: MorningTone
  /**
   * The highest level (2 or 3) among Developing pillars.
   * Only meaningful when tone === 'coaching'.
   * Used to calibrate between Jamming-context (level 2) and Grooving-context (level 3) copy.
   */
  highestDevelopingLevel: number | null
}

/**
 * Resolves the morning notification tone from the user's active pillar levels.
 *
 * Priority order:
 *   1. Any pillar Building (level 1)  → motivational
 *   2. All pillars Anchored (level 4+) → reflective
 *   3. Otherwise (mix of Developing, or Developing + Anchored) → coaching
 */
export function resolveMorningTone(pillarLevels: PillarLevel[]): MorningToneResult {
  // No active pillars at all — motivational fallback
  if (pillarLevels.length === 0) {
    return { tone: 'motivational', highestDevelopingLevel: null }
  }

  const states = pillarLevels.map(r => ({
    level: r.level,
    state: resolveOperatingState(r.level),
  }))

  // Any Building pillar → motivational (Tuning needs the most encouragement)
  if (states.some(s => s.state === 'building')) {
    return { tone: 'motivational', highestDevelopingLevel: null }
  }

  // All Anchored → reflective
  if (states.every(s => s.state === 'anchored')) {
    return { tone: 'reflective', highestDevelopingLevel: null }
  }

  // Mix of Developing (± Anchored) → coaching, calibrated to highest Developing level
  const developingLevels = states
    .filter(s => s.state === 'developing')
    .map(s => s.level)
  const highestDevelopingLevel = developingLevels.length > 0
    ? Math.max(...developingLevels)
    : null

  return { tone: 'coaching', highestDevelopingLevel }
}
