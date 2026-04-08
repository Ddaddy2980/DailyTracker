// =============================================================================
// Next Pillar Invitation Engine — Step 40
//
// Pure functions only. No Supabase, no side effects.
// Inputs: the user's pillar_levels rows.
// Output: the single PillarName to invite next, or null if no invitation needed.
//
// Two triggers (per CLAUDE.md Step 40):
//   1. Dormant — a pillar has no row in pillar_levels (never started)
//   2. Gap     — a pillar is two or more levels below the user's highest active pillar
//
// Priority when multiple pillars qualify:
//   Dormant pillars before gap pillars.
//   Within each group, lowest level first (for gap) or canonical order (for dormant).
//
// Invitation copy (per PRODUCT.md) is co-located here so the engine and the
// UI strings stay in one place and import from a single source.
// =============================================================================

import type { PillarName, PillarLevel } from './types'
import { type GaugeEntryRow, isPillarComplete } from './gauge-engine'

// Canonical display order — used for tie-breaking when multiple pillars qualify.
const PILLAR_ORDER: PillarName[] = [
  'spiritual',
  'physical',
  'nutritional',
  'personal',
  'missional',
]

// =============================================================================
// Core resolver
// =============================================================================

/**
 * Given a user's pillar_levels rows, returns the single pillar that should
 * receive a Next Pillar Invitation, or null if no invitation is warranted.
 *
 * Called once per challenge completion. The field next_pillar_invitation_pillar
 * on user_profile is only written when this returns a non-null value.
 */
export function resolveNextPillarInvitation(
  pillarLevels: PillarLevel[]
): PillarName | null {
  const activeRows = pillarLevels.filter((r) => r.level >= 1)

  // No active pillars at all — nothing to compare against.
  if (activeRows.length === 0) return null

  const highestLevel = Math.max(...activeRows.map((r) => r.level))

  // ── Dormant pillars (no row in pillar_levels) ────────────────────────────
  const activePillarSet = new Set(activeRows.map((r) => r.pillar))
  const dormant = PILLAR_ORDER.filter((p) => !activePillarSet.has(p))

  if (dormant.length > 0) {
    // First dormant pillar in canonical order
    return dormant[0]
  }

  // ── Gap pillars (2+ levels below highest active pillar) ──────────────────
  // Only meaningful when the highest level is 3 or above — you cannot be
  // 2 levels below if the highest is 1 or 2 (min possible level is 1).
  if (highestLevel < 3) return null

  const gapPillars = activeRows
    .filter((r) => highestLevel - r.level >= 2)
    .sort((a, b) => {
      // Lowest level first; canonical order breaks ties.
      if (a.level !== b.level) return a.level - b.level
      return PILLAR_ORDER.indexOf(a.pillar) - PILLAR_ORDER.indexOf(b.pillar)
    })

  if (gapPillars.length > 0) {
    return gapPillars[0].pillar
  }

  return null
}

// =============================================================================
// Invitation copy
// =============================================================================

export interface PillarInvitationCopy {
  heading: string
  body: string
  /** Name of the strong pillar(s) to reference in the body — filled in at call site */
  strongPillarLabel?: string
}

/**
 * Returns the invitation heading and body for the given pillar.
 * `strongPillars` is the list of the user's highest-level pillar display names —
 * used to personalize the body text.
 */
export function getInvitationCopy(
  invitedPillar: PillarName,
  isDormant: boolean,
  strongPillarNames: string[],    // e.g. ['Physical', 'Spiritual']
  invitedPillarName: string,      // e.g. 'Nutritional'
): PillarInvitationCopy {
  const strong = formatList(strongPillarNames)

  if (!isDormant) {
    // Gap trigger — pillar is active but significantly behind
    return {
      heading: `${invitedPillarName} is ready for more attention`,
      body: `Your ${strong} ${pillarsAre(strongPillarNames.length)} rooted. ${invitedPillarName} hasn't had the same attention. Your next challenge is a good time to change that. What's one thing you could do for ${invitedPillarName.toLowerCase()} every single day?`,
    }
  }

  // Dormant trigger — pillar has never been started
  if (invitedPillar === 'missional') {
    return {
      heading: `The Missional pillar is waiting`,
      body: `Your other pillars are building strong. But the Missional pillar — investing intentionally in the lives of others — hasn't started yet. You don't have to do something dramatic. Think ONE person. One daily habit of noticing, praying, or reaching. That's where it begins.`,
    }
  }

  return {
    heading: `${invitedPillarName} is sitting on the sideline`,
    body: `You've built something real in ${strong}. But ${invitedPillarName} has been sitting on the sideline. You don't have to attack it — just bring it into the fold. One small, sustainable goal. That's all it takes to get it started.`,
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Returns display names for all pillars at level 3 or above (Grooving / Soloing /
 * Orchestrating). These are the "strong" pillars referenced in invitation copy.
 */
export function getStrongPillarNames(pillarLevels: PillarLevel[]): string[] {
  return pillarLevels
    .filter((r) => r.level >= 3)
    .sort((a, b) => PILLAR_ORDER.indexOf(a.pillar) - PILLAR_ORDER.indexOf(b.pillar))
    .map((r) => PILLAR_DISPLAY_NAMES[r.pillar])
}

// =============================================================================
// Rolling window threshold
// =============================================================================

/**
 * Per-level rolling window configuration.
 * windowDays:    how many calendar days form the window (inclusive of today).
 * minCompletions: how many of those days must have a pillar completion.
 *
 * Grooving (level 3) threshold is deferred — defined when Step 30 completion
 * sequence is built.
 */
export const INVITATION_THRESHOLDS: Partial<Record<number, { windowDays: number; minCompletions: number }>> = {
  1: { windowDays: 7,  minCompletions: 4  },
  2: { windowDays: 14, minCompletions: 10 },
  3: { windowDays: 30, minCompletions: 22 },
  // Soloing → Orchestrating: 80% threshold matches the Soloing advancement criteria (PRODUCT.md line 422).
  4: { windowDays: 30, minCompletions: 24 },
}

/**
 * Returns true if the invited pillar has enough completions in the rolling window
 * ending on `today` (inclusive) to warrant surfacing an invitation.
 *
 * `entries` must cover at least the last `windowDays` calendar days — the caller
 * is responsible for fetching a wide enough window. Days with no entry row are
 * treated as missed (no completion).
 *
 * Uses `isPillarComplete` from the gauge engine so completion-detection logic
 * stays in one place.
 */
export function meetsRollingWindowThreshold(
  entries:        GaugeEntryRow[],
  pillar:         PillarName,
  today:          string,          // ISO date e.g. '2026-04-03'
  windowDays:     number,
  minCompletions: number,
): boolean {
  const todayMs       = new Date(today + 'T00:00:00Z').getTime()
  const windowStartMs = todayMs - (windowDays - 1) * 86_400_000   // inclusive

  let completionCount = 0
  for (const row of entries) {
    const rowMs = new Date(row.entry_date + 'T00:00:00Z').getTime()
    if (rowMs >= windowStartMs && rowMs <= todayMs && isPillarComplete(row, pillar)) {
      completionCount++
    }
  }

  return completionCount >= minCompletions
}

/** Whether the given pillar has no row in pillar_levels (never started). */
export function isPillarDormant(
  pillar: PillarName,
  pillarLevels: PillarLevel[]
): boolean {
  return !pillarLevels.some((r) => r.pillar === pillar)
}

/** Pillar display names (capitalized). */
export const PILLAR_DISPLAY_NAMES: Record<PillarName, string> = {
  spiritual:   'Spiritual',
  physical:    'Physical',
  nutritional: 'Nutritional',
  personal:    'Personal',
  missional:   'Missional',
}

// "Physical, Spiritual, and Nutritional" / "Physical and Spiritual" / "Physical"
function formatList(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

// "is" vs "are"
function pillarsAre(count: number): string {
  return count === 1 ? 'is' : 'are'
}
