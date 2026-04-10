// =============================================================================
// v3 Constants — Daily Consistency Tracker
//
// What lives here:
//   - PILLAR_CONFIG      — colors, icons, labels (authoritative design tokens)
//   - PILLAR_ORDER       — canonical display order for the five pillars
//   - CHALLENGE_DURATIONS — user-selectable total challenge lengths
//   - LEVEL_NAMES        — LevelNumber → display name
//   - SCORE_TO_LEVEL     — Consistency Profile score → starting LevelNumber
//   - ROLLING_WINDOW_THRESHOLDS — advancement rules per level
//   - DURATION_GOAL_CAP  — max duration goals allowed per level
//   - DESTINATION_GOAL_CAP — max destination goals per pillar per level
//   - CLARITY_VIDEOS     — three onboarding clarity video definitions
//   - Utility functions  — todayStr, getDayNumber, fmtDate, scoreToLevel
//
// What does NOT live here:
//   - Component-specific logic
//   - Supabase queries
//   - Notification copy (not yet defined for v3)
// =============================================================================

import type {
  PillarName,
  LevelNumber,
  LevelName,
  ChallengeDuration,
  VideoEntry,
} from '@/lib/types'


// =============================================================================
// PILLAR_CONFIG
// Authoritative design tokens for all pillar card UI.
// Always import from here — never hardcode hex values in components.
// Use Tailwind arbitrary value syntax: bg-[#275578], text-[#82B2DE], etc.
// =============================================================================

export const PILLAR_CONFIG = {
  spiritual: {
    background:  '#275578',
    title:       '#82B2DE',
    subtitle:    '#608BAF',
    saveButton:  '#376891',
    icon:        '/spiritual_icon.png',
    label:       'Spiritual',
  },
  physical: {
    background:  '#202644',
    title:       '#8A96CD',
    subtitle:    '#656E96',
    saveButton:  '#2C345B',
    icon:        '/physical_icon.png',
    label:       'Physical',
  },
  nutritional: {
    background:  '#B85D27',
    title:       '#F7B188',
    subtitle:    '#D19675',
    saveButton:  '#CC6930',
    icon:        '/nutritional_icon.png',
    label:       'Nutritional',
  },
  personal: {
    background:  '#2E5144',
    title:       '#96CE95',
    subtitle:    '#77A676',
    saveButton:  '#3B6051',
    icon:        '/personal_icon.png',
    label:       'Personal',
  },
  relational: {
    background:  '#317C80',
    title:       '#82C7CB',
    subtitle:    '#6AA2A6',
    saveButton:  '#3F9297',
    icon:        '/relational_icon.png',
    label:       'Relational',
  },
} as const

export type PillarConfigKey = keyof typeof PILLAR_CONFIG


// =============================================================================
// PILLAR_ORDER
// Canonical display order for the five pillars throughout the app.
// Use this array whenever rendering pillars in sequence.
// =============================================================================

export const PILLAR_ORDER: PillarName[] = [
  'spiritual',
  'physical',
  'nutritional',
  'personal',
  'relational',
]


// =============================================================================
// CHALLENGE_DURATIONS
// User-selectable total challenge lengths shown on the onboarding duration screen.
// Displayed as selectable cards. The chosen value is stored in challenges.duration_days.
// Note: 14 days is intentionally excluded in v3. The 7-day Tuning cycle and
// 14-day Jamming cycle are internal pillar progression windows, not challenge lengths.
// =============================================================================

export const CHALLENGE_DURATIONS: ChallengeDuration[] = [21, 30, 60, 90, 100]


// =============================================================================
// LEVEL_NAMES
// Maps a LevelNumber to its display name.
// =============================================================================

export const LEVEL_NAMES: Record<LevelNumber, LevelName> = {
  1: 'Tuning',
  2: 'Jamming',
  3: 'Grooving',
  4: 'Soloing',
}

// Short status phrase shown on the Pillar Portrait and pillar cards
export const LEVEL_STATUS_PHRASES: Record<LevelNumber, string> = {
  1: 'Starting Fresh',
  2: 'Finding Your Rhythm',
  3: 'Building Momentum',
  4: 'Rooted & Running',
}


// =============================================================================
// SCORE_TO_LEVEL
// Maps a Consistency Profile pillar score (0–12) to a starting LevelNumber.
// Used after the profile is scored to seed pillar_levels.
// =============================================================================

export function scoreToLevel(score: number): LevelNumber {
  if (score >= 10) return 4   // Soloing
  if (score >= 7)  return 3   // Grooving
  if (score >= 4)  return 2   // Jamming
  return 1                    // Tuning (0–3)
}

// Score band boundaries — used for display in the Pillar Portrait
export const SCORE_BANDS: Array<{ min: number; max: number; level: LevelNumber }> = [
  { min: 0,  max: 3,  level: 1 },
  { min: 4,  max: 6,  level: 2 },
  { min: 7,  max: 9,  level: 3 },
  { min: 10, max: 12, level: 4 },
]


// =============================================================================
// ROLLING_WINDOW_THRESHOLDS
// Advancement rules evaluated per pillar on every pillar save.
// Source of truth for the rolling window engine in /lib/rolling-window.ts.
//
// windowDays: how many calendar days to look back (strict sliding window)
// required:   minimum completions within that window to advance
// nextLevel:  the level the pillar advances to when threshold is met
// =============================================================================

export const ROLLING_WINDOW_THRESHOLDS: Record<
  number,
  { windowDays: number; required: number; nextLevel: LevelNumber }
> = {
  1: { windowDays: 7,  required: 4,  nextLevel: 2 },   // Tuning  → Jamming
  2: { windowDays: 14, required: 10, nextLevel: 3 },   // Jamming → Grooving
  3: { windowDays: 60, required: 48, nextLevel: 4 },   // Grooving → Soloing
  // Level 4 (Soloing) has no advancement threshold — it is the current ceiling
}


// =============================================================================
// DURATION_GOAL_CAP
// Maximum number of active duration goals allowed per pillar at each level.
// Enforced in application code at save time — never in the database.
// =============================================================================

export const DURATION_GOAL_CAP: Record<LevelNumber, number> = {
  1: 1,   // Tuning  — one goal only
  2: 2,   // Jamming — up to 2
  3: 3,   // Grooving — up to 3
  4: 4,   // Soloing — up to 4
}


// =============================================================================
// DESTINATION_GOAL_CAP
// Maximum active destination goals per pillar at each level.
// null = unlimited. 0 = destination goals not available at this level.
// Enforced in application code at save time.
// =============================================================================

export const DESTINATION_GOAL_CAP: Record<LevelNumber, number | null> = {
  1: 0,     // Tuning   — not available
  2: 0,     // Jamming  — not available
  3: 3,     // Grooving — up to 3 per pillar
  4: null,  // Soloing  — unlimited (null = no cap)
}

// Helper: returns true when destination goals are available at this level
export function destinationGoalsAvailable(level: LevelNumber): boolean {
  return level >= 3
}

// Helper: returns true when the destination goal cap has been reached for a pillar
export function destinationGoalCapReached(
  level: LevelNumber,
  activeCount: number
): boolean {
  const cap = DESTINATION_GOAL_CAP[level]
  if (cap === null) return false   // unlimited
  return activeCount >= cap
}


// =============================================================================
// CLARITY_VIDEOS
// Three onboarding videos shown on the clarity screen (/onboarding/videos).
// One screen, three video boxes. Watchable in any order. Skippable.
// url: '' until recordings are complete — renders a "Coming soon" placeholder.
// =============================================================================

export const CLARITY_VIDEOS: VideoEntry[] = [
  {
    id:      'CLARITY_1',
    module:  'clarity',
    trigger: 'onboarding_clarity',
    title:   'Living on Purpose',
    url:     '',  // ~60 seconds: "Living on Purpose is the how of a life lived with meaning"
  },
  {
    id:      'CLARITY_2',
    module:  'clarity',
    trigger: 'onboarding_clarity',
    title:   'Duration vs. Destination Goals',
    url:     '',  // ~60 seconds: The Rollercoaster Effect — why duration goals stick
  },
  {
    id:      'CLARITY_3',
    module:  'clarity',
    trigger: 'onboarding_clarity',
    title:   'The Five Pillars',
    url:     '',  // ~60 seconds: Whole-life vision, Sea of Galilee illustration
  },
]


// =============================================================================
// Utility functions
// =============================================================================

// Returns today's date as an ISO date string (YYYY-MM-DD) in local time.
// Use this everywhere a "today" date string is needed — never new Date().toISOString().
export function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

// Returns the 1-based day number within a challenge.
// Day 1 = start_date. Day 2 = start_date + 1. Etc.
// targetDate defaults to today if not provided.
export function getDayNumber(startDate: string, targetDate?: string): number {
  const s = new Date(startDate + 'T00:00:00')
  const t = new Date((targetDate ?? todayStr()) + 'T00:00:00')
  return Math.max(1, Math.floor((t.getTime() - s.getTime()) / 86400000) + 1)
}

// Formats an ISO date string for display (e.g. "Apr 10, 2026")
export function fmtDate(dateKey: string): string {
  return new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  })
}

// Returns the N calendar dates (inclusive) ending at and including endDate,
// ordered oldest → newest. Used to build rolling window arrays.
// endDate defaults to today.
export function rollingWindowDates(windowDays: number, endDate?: string): string[] {
  const end = new Date((endDate ?? todayStr()) + 'T00:00:00')
  const dates: string[] = []
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

// Returns the overall daily completion percentage across all active pillars.
// completedCount: number of pillars where completed = true today
// activeCount: total number of active (non-dormant) pillars
export function calcDailyCompletionPct(completedCount: number, activeCount: number): number {
  if (activeCount === 0) return 0
  return Math.round((completedCount / activeCount) * 100)
}
