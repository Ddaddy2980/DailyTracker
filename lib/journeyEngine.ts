// =============================================================================
// journeyEngine.ts — Continuous Journey Architecture
//
// Single source of truth for all level advancement logic.
// No other file in the codebase should contain level advancement logic.
//
// Grandfather clause: every function checks is_continuous before acting.
// Legacy challenges (is_continuous = false) return status but never trigger
// any advancement side-effects.
//
// NOTE on evaluateJammingPhase1 signature:
//   The spec defines evaluateJammingPhase1(challenge: Challenge) but the
//   Challenge row has no column tracking per-day engagement for Days 8–14
//   (only tuning_days_completed exists in the schema). Rather than require
//   a second DB query inside a pure function, the caller (processJourneyMilestones)
//   computes jammingDaysCount from challenge_entries and passes it in.
//   This keeps the engine free of database dependencies.
// =============================================================================

import { LEVEL_NAMES }            from '@/lib/types'
import type {
  Challenge,
  TuningEvaluationResult,
  JammingPhase1Result,
  JourneyStatus,
  JourneyLevelPreview,
  LevelName,
} from '@/lib/types'

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Returns today's date as a YYYY-MM-DD string, consistent with the rest of
 * the codebase (en-CA locale = ISO date format).
 */
function todayDateStr(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

/**
 * Returns the first day number of a given level.
 *   Level 1 → Day 1
 *   Level 2 → Day 8
 *   Level 3 → Day 22
 *   Level 4 → Day 61
 */
function levelStartDay(level: number): number {
  switch (level) {
    case 1: return 1
    case 2: return 8
    case 3: return 22
    case 4: return 61
    default: return 1
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the current day number of the journey (1-based).
 * Day 1 = the start date itself.
 * Never returns less than 1.
 */
export function calculateCurrentDay(startDate: string): number {
  const startMs = new Date(startDate + 'T00:00:00').getTime()
  const todayMs = new Date(todayDateStr() + 'T00:00:00').getTime()
  return Math.max(1, Math.floor((todayMs - startMs) / 86_400_000) + 1)
}

/**
 * Returns the array of levels the journey will reach, based on total days.
 *
 * Rules (per Q4 answers):
 *   - Always Level 1 Tuning:   Days 1–7
 *   - totalDays >= 8:          Level 2 Jamming ends at min(21, totalDays)
 *   - totalDays >= 22:         Level 3 Grooving ends at totalDays unless
 *                              totalDays >= 61, in which case ends at Day 60
 *   - totalDays >= 61:         Level 4 Soloing: Days 61–totalDays
 *
 * Example outputs:
 *   totalDays=7   → [Tuning 1-7]
 *   totalDays=14  → [Tuning 1-7, Jamming 8-14]
 *   totalDays=21  → [Tuning 1-7, Jamming 8-21]
 *   totalDays=30  → [Tuning 1-7, Jamming 8-21, Grooving 22-30]
 *   totalDays=66  → [Tuning 1-7, Jamming 8-21, Grooving 22-66]
 *   totalDays=100 → [Tuning 1-7, Jamming 8-21, Grooving 22-60, Soloing 61-100]
 */
export function calculateJourneyPreview(totalDays: number): JourneyLevelPreview[] {
  const levels: JourneyLevelPreview[] = []

  // Level 1 — Tuning
  const tuningEnd = Math.min(7, totalDays)
  levels.push({ level: 1, name: 'Tuning', days: `1-${tuningEnd}` })

  if (totalDays < 8) return levels

  // Level 2 — Jamming (ends at Day 21 or totalDays, whichever is smaller)
  const jammingEnd = Math.min(21, totalDays)
  levels.push({ level: 2, name: 'Jamming', days: `8-${jammingEnd}` })

  if (totalDays < 22) return levels

  // Level 3 — Grooving
  // Grooving runs to the end unless Soloing also fits in this journey
  const groovingEnd = totalDays >= 61 ? 60 : totalDays
  levels.push({ level: 3, name: 'Grooving', days: `22-${groovingEnd}` })

  if (totalDays < 61) return levels

  // Level 4 — Soloing
  levels.push({ level: 4, name: 'Soloing', days: `61-${totalDays}` })

  return levels
}

/**
 * Returns the level number (1–4) for a given day number.
 *
 *   Days 1–7   → Level 1 (Tuning)
 *   Days 8–21  → Level 2 (Jamming)
 *   Days 22–60 → Level 3 (Grooving)
 *   Days 61+   → Level 4 (Soloing)
 *
 * Note: in processJourneyMilestones, callers must not pass dayNumbers >= 61
 * when the challenge's totalDays < 61 — the level-61 threshold only applies
 * when Soloing is part of this journey.
 */
export function getLevelForDay(dayNumber: number): number {
  if (dayNumber <= 7)  return 1
  if (dayNumber <= 21) return 2
  if (dayNumber <= 60) return 3
  return 4
}

/**
 * Evaluates Tuning completion at Day 7.
 *
 * Reads challenge.tuning_days_completed — the count of Days 1–7 where at
 * least one pillar had data saved. Incremented by processJourneyMilestones
 * on each check-in during Days 1–7.
 *
 * Outcomes:
 *   tuning_days_completed >= 5 → advance        / full_celebration
 *   tuning_days_completed >= 3 → grace_advance   / grace_passage
 *   tuning_days_completed <  3 → reset_offer     / pastoral_reset
 *
 * Throws if called when tuning_evaluation_done = true — this indicates a
 * programming error in the caller (processJourneyMilestones should guard).
 */
export function evaluateTuningCompletion(challenge: Challenge): TuningEvaluationResult {
  if (challenge.tuning_evaluation_done) {
    throw new Error(
      `evaluateTuningCompletion: already evaluated for challenge ${challenge.id}`
    )
  }

  const days = challenge.tuning_days_completed

  if (days >= 5) return { outcome: 'advance',       message: 'full_celebration' }
  if (days >= 3) return { outcome: 'grace_advance',  message: 'grace_passage'   }
  return               { outcome: 'reset_offer',     message: 'pastoral_reset'  }
}

/**
 * Evaluates Jamming Phase 1 completion at Day 14.
 *
 * jammingDaysCount: the number of Days 8–14 where at least one pillar had
 * data saved. This value is computed by the caller (processJourneyMilestones)
 * from challenge_entries, since the Challenge row has no equivalent of
 * tuning_days_completed for the Jamming phase.
 *
 * Outcome:
 *   jammingDaysCount >= 5 → { unlock_phase2: true  }
 *   jammingDaysCount <  5 → { unlock_phase2: false }
 *
 * Throws if called when jamming_phase1_completed = true.
 */
export function evaluateJammingPhase1(
  challenge:        Challenge,
  jammingDaysCount: number,
): JammingPhase1Result {
  if (challenge.jamming_phase1_completed) {
    throw new Error(
      `evaluateJammingPhase1: phase 1 already completed for challenge ${challenge.id}`
    )
  }
  return { unlock_phase2: jammingDaysCount >= 5 }
}

/**
 * Returns a complete JourneyStatus object consumed by the dashboard and
 * routing logic. Safe to call on both legacy and continuous challenges.
 *
 * For legacy challenges (is_continuous = false):
 *   - isLegacy = true
 *   - No evaluation fields are set
 *   - Uses challenge.level (the original level column) for currentLevel
 *
 * For continuous challenges (is_continuous = true):
 *   - Uses journey_current_level for currentLevel
 *   - tuningEvaluationPending is true when pending_journey_event signals
 *     an unacknowledged tuning evaluation result
 *   - jammingPhase2Available is true when the Day 14 consistency threshold
 *     was met (jamming_phase2_unlocked = true)
 */
export function getJourneyStatus(challenge: Challenge): JourneyStatus {
  const currentDay = calculateCurrentDay(challenge.start_date)

  // ── Legacy challenge ──────────────────────────────────────────────────────
  if (!challenge.is_continuous) {
    return {
      currentDay,
      currentLevel:            challenge.level,
      levelName:               (LEVEL_NAMES[challenge.level] ?? 'Tuning') as LevelName,
      daysInCurrentLevel:      currentDay,
      totalDays:               challenge.duration_days,
      isLegacy:                true,
      tuningEvaluationPending: false,
      jammingPhase2Available:  false,
    }
  }

  // ── Continuous journey ────────────────────────────────────────────────────
  const currentLevel = challenge.journey_current_level
  const startDay     = levelStartDay(currentLevel)

  // How many days the user has spent inside the current level (1-based).
  // e.g. Day 10, Level 2 (starts Day 8) → 10 - 8 + 1 = 3 days in level.
  const daysInCurrentLevel = Math.max(1, currentDay - startDay + 1)

  const tuningEvaluationPending =
    challenge.pending_journey_event?.type === 'tuning_evaluation'

  // Phase 2 is "available" in the sense that the consistency threshold was
  // met. The modal offer is driven by pending_journey_event; this flag drives
  // whether the second-goal UI is visible after the user accepts.
  const jammingPhase2Available = challenge.jamming_phase2_unlocked

  return {
    currentDay,
    currentLevel,
    levelName:               (LEVEL_NAMES[currentLevel] ?? 'Tuning') as LevelName,
    daysInCurrentLevel,
    totalDays:               challenge.duration_days,
    isLegacy:                false,
    tuningEvaluationPending,
    jammingPhase2Available,
  }
}
