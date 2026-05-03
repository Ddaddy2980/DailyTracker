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
  PulseState,
  VideoEntry,
  VideoLibrarySection,
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

// Maximum total calendar days a challenge may be paused across its lifetime.
// Enforced in /api/challenges/pause and displayed in PausedDashboard / ChallengePauseTools.
export const MAX_PAUSE_DAYS = 14


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
// DURATION_GOAL_SUGGESTIONS
// Pre-written ACT-compliant goal suggestions shown per pillar in GoalSuggestions.
// Tap a suggestion to fill the goal input and auto-check all three ACT boxes.
// Relational suggestions use Think ONE / Four B's framing — no missional language.
// Replace placeholder copy with final copy before launch.
// =============================================================================

export const DURATION_GOAL_SUGGESTIONS: Record<PillarName, string[]> = {
  spiritual: [
    'Read scripture for 10 minutes',
    'Spend 10 minutes in prayer',
    'Write one thing I am grateful to God for',
    'Meditate on a verse for 5 minutes',
    'Listen to a worship song with full intention',
  ],
  physical: [
    'Complete a 20-minute workout',
    'Walk for 30 minutes',
    'Do 10 minutes of stretching or mobility work',
    'Complete a bodyweight strength routine',
    'Do any active movement for at least 20 minutes',
  ],
  nutritional: [
    'Eat a whole-food breakfast',
    'Drink 8 glasses of water',
    'Eat at least 3 servings of vegetables',
    'Avoid added sugar for the day',
    'Prepare at least one home-cooked meal',
  ],
  personal: [
    'Read for 20 minutes',
    'Spend 15 minutes on a personal development skill',
    'Write in a journal for 10 minutes',
    'Review and prioritize my top 3 tasks for the day',
    'Spend 10 minutes learning something new',
  ],
  relational: [
    'Have a meaningful conversation with someone I care about',
    'Send an encouraging message to a friend or family member',
    'Be fully present with my family for 30 minutes — no phone',
    'Pray intentionally for one person in my life today',
    'Look for one opportunity to serve or encourage someone today',
  ],
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
// VIDEO_LIBRARY
// All coaching and onboarding videos indexed by ID.
// url: '' until recordings are complete — UI renders a Coming Soon placeholder.
// IDs match the PRODUCT.md module naming: A1–A4, B1–B5, C1–C4, D1–D7, J1–J7, G series.
// CLARITY_1–3 are also included here so the library page can reference them
// consistently — video_progress rows use these IDs across all contexts.
// =============================================================================

export const VIDEO_LIBRARY: Record<string, VideoEntry> = {
  // ── Clarity (onboarding) ────────────────────────────────────────────────────
  CLARITY_1: { id: 'CLARITY_1', module: 'clarity', trigger: 'onboarding_clarity',
    title: 'Living on Purpose', url: '' },
  CLARITY_2: { id: 'CLARITY_2', module: 'clarity', trigger: 'onboarding_clarity',
    title: 'Duration vs. Destination Goals', url: '' },
  CLARITY_3: { id: 'CLARITY_3', module: 'clarity', trigger: 'onboarding_clarity',
    title: 'The Five Pillars', url: '' },

  // ── Module A — Living on Purpose (foundation) ───────────────────────────────
  A1: { id: 'A1', module: 'foundation', trigger: 'tuning_day0',
    title: 'Why your life feels like it\'s passing you by', url: '' },
  A2: { id: 'A2', module: 'foundation', trigger: 'tuning_day0',
    title: 'The difference between Living for, with, and on Purpose', url: '' },
  A3: { id: 'A3', module: 'foundation', trigger: 'tuning_day1',
    title: 'Why small habits are not small', url: '' },
  A4: { id: 'A4', module: 'foundation', trigger: 'tuning_day1',
    title: 'The five attacks against consistency', url: '' },

  // ── Module B — Five Pillar intros ───────────────────────────────────────────
  B1: { id: 'B1', module: 'pillars', trigger: 'tuning_spiritual_day1',
    title: 'Why your spiritual life is the foundation of everything else', url: '' },
  B2: { id: 'B2', module: 'pillars', trigger: 'tuning_physical_day1',
    title: 'Your body is not separate from your purpose', url: '' },
  B3: { id: 'B3', module: 'pillars', trigger: 'tuning_nutritional_day1',
    title: 'What you eat is what you become', url: '' },
  B4: { id: 'B4', module: 'pillars', trigger: 'tuning_personal_day1',
    title: 'You are more than your to-do list', url: '' },
  B5: { id: 'B5', module: 'pillars', trigger: 'tuning_relational_day1',
    title: 'Think ONE — living intentionally for others', url: '' },

  // ── Module C — Duration goals & ACT ────────────────────────────────────────
  C1: { id: 'C1', module: 'goals', trigger: 'onboarding_goals',
    title: 'Why destination goals keep failing you', url: '' },
  C2: { id: 'C2', module: 'goals', trigger: 'onboarding_goals',
    title: 'The one question that changes everything', url: '' },
  C3: { id: 'C3', module: 'goals', trigger: 'goal_setup',
    title: 'How to write a goal that actually works — the ACT test', url: '' },
  C4: { id: 'C4', module: 'goals', trigger: 'tuning_stall',
    title: 'What to do when you miss a day', url: '' },

  // ── Module D — Daily Tuning coaching (D1–D7) ───────────────────────────────
  D1: { id: 'D1', module: 'tuning', trigger: 'tuning_day1',
    title: 'Day 1: Let\'s go. Here\'s what today is about.', url: '' },
  D2: { id: 'D2', module: 'tuning', trigger: 'tuning_day2',
    title: 'Day 2: The awkwardness is normal — here\'s why.', url: '' },
  D3: { id: 'D3', module: 'tuning', trigger: 'tuning_day3',
    title: 'Day 3: The hardest day. Don\'t quit on day 3.', url: '' },
  D4: { id: 'D4', module: 'tuning', trigger: 'tuning_day4',
    title: 'Day 4: You made it through the hard part. Halfway there.', url: '' },
  D5: { id: 'D5', module: 'tuning', trigger: 'tuning_day5',
    title: 'Day 5: Notice anything yet? Here\'s what\'s forming.', url: '' },
  D6: { id: 'D6', module: 'tuning', trigger: 'tuning_day6',
    title: 'Day 6: One day left. Don\'t coast across the finish line.', url: '' },
  D7: { id: 'D7', module: 'tuning', trigger: 'tuning_day7',
    title: 'Day 7: You finished. Here\'s what that means.', url: '' },

  // ── J Series — Jamming ──────────────────────────────────────────────────────
  J1: { id: 'J1', module: 'jamming', trigger: 'jamming_onboarding',
    title: 'Welcome to Jamming. Here\'s what\'s different.', url: '' },
  J2: { id: 'J2', module: 'jamming', trigger: 'jamming_day1_2',
    title: 'Why adding a second pillar feels like starting over (and why it\'s not)', url: '' },
  J3: { id: 'J3', module: 'jamming', trigger: 'jamming_day6',
    title: 'The weekly check-in: why reviewing matters more than tracking', url: '' },
  J4: { id: 'J4', module: 'jamming', trigger: 'pulse_smooth_sailing',
    title: 'What\'s forming in you right now', url: '' },
  J5: { id: 'J5', module: 'jamming', trigger: 'pulse_rough_waters',
    title: 'Still in it means you\'re winning', url: '' },
  J6: { id: 'J6', module: 'jamming', trigger: 'pulse_taking_on_water',
    title: 'Let\'s make this survivable', url: '' },
  J7: { id: 'J7', module: 'jamming', trigger: 'jamming_completion',
    title: 'Jamming complete. You\'ve built something real.', url: '' },

  // ── G Series — Grooving ─────────────────────────────────────────────────────
  G1: { id: 'G1', module: 'grooving', trigger: 'grooving_onboarding',
    title: 'Welcome to Grooving. The question changes here.', url: '' },
  G2: { id: 'G2', module: 'grooving', trigger: 'grooving_25_5',
    title: 'Why the 25/5 exercise will change how you see your time', url: '' },
  G3: { id: 'G3', module: 'grooving', trigger: 'grooving_calendar',
    title: 'What the habit calendar is really showing you', url: '' },
  G4: { id: 'G4', module: 'grooving', trigger: 'grooving_circle',
    title: 'The people who finish are the people who feel witnessed', url: '' },
  G5: { id: 'G5', module: 'grooving', trigger: 'grooving_rooted',
    title: 'Something just happened — your habit has taken root', url: '' },
  G6: { id: 'G6', module: 'grooving', trigger: 'grooving_destination_intro',
    title: 'From how to where — introducing destination goals', url: '' },
  G6b: { id: 'G6b', module: 'grooving', trigger: 'grooving_first_destination_goal',
    title: 'Setting a direction within your daily habit', url: '' },
  G7: { id: 'G7', module: 'grooving', trigger: 'grooving_pause',
    title: 'What to do when life interrupts your challenge', url: '' },
  'G-Return': { id: 'G-Return', module: 'grooving', trigger: 'grooving_return',
    title: 'Welcome back. You didn\'t quit — you paused.', url: '' },
  G8: { id: 'G8', module: 'grooving', trigger: 'grooving_completion',
    title: 'Grooving complete. Look at what you\'ve built.', url: '' },
  'G-Smooth': { id: 'G-Smooth', module: 'grooving', trigger: 'pulse_smooth_sailing',
    title: 'You\'re in the groove. Notice what that feels like.', url: '' },
  'G-Rough': { id: 'G-Rough', module: 'grooving', trigger: 'pulse_rough_waters',
    title: 'Long challenges have hard weeks. This is one of them.', url: '' },
  'G-Water': { id: 'G-Water', module: 'grooving', trigger: 'pulse_taking_on_water',
    title: 'Let\'s figure out what this challenge needs to look like for you to finish it.', url: '' },
}

// Maps pillar name to its Module B intro video ID (shown on Day 1 of Tuning)
const PILLAR_INTRO_VIDEO_ID: Record<PillarName, string> = {
  spiritual:   'B1',
  physical:    'B2',
  nutritional: 'B3',
  personal:    'B4',
  relational:  'B5',
}

// ---------------------------------------------------------------------------
// selectTuningVideo
// Returns the appropriate coaching video for a Tuning-level pillar card.
//
// - Day 1 of the challenge → pillar-specific intro (Module B)
// - Stalled (3+ of last 3 days missed) → recovery video (C4)
// - Otherwise → daily coaching D1–D7, capped at D7 (shared across all Tuning pillars)
// ---------------------------------------------------------------------------
export function selectTuningVideo(
  pillar: PillarName,
  challengeDay: number,
  stalledDays: number
): VideoEntry {
  if (challengeDay <= 1) return VIDEO_LIBRARY[PILLAR_INTRO_VIDEO_ID[pillar]]
  if (stalledDays >= 3)  return VIDEO_LIBRARY['C4']
  return VIDEO_LIBRARY[`D${Math.min(challengeDay, 7)}`]
}

// ---------------------------------------------------------------------------
// selectJammingVideo
// Returns the coaching video for a Jamming-level pillar card, driven by pulse state.
// ---------------------------------------------------------------------------
export function selectJammingVideo(pulseState: PulseState): VideoEntry {
  if (pulseState === 'smooth_sailing')   return VIDEO_LIBRARY['J4']
  if (pulseState === 'rough_waters')     return VIDEO_LIBRARY['J5']
  return VIDEO_LIBRARY['J6']
}

// ---------------------------------------------------------------------------
// selectGroovingVideo
// Returns the coaching video for a Grooving-level pillar card, driven by pulse state.
// ---------------------------------------------------------------------------
export function selectGroovingVideo(pulseState: PulseState): VideoEntry {
  if (pulseState === 'smooth_sailing')   return VIDEO_LIBRARY['G-Smooth']
  if (pulseState === 'rough_waters')     return VIDEO_LIBRARY['G-Rough']
  return VIDEO_LIBRARY['G-Water']
}

// ---------------------------------------------------------------------------
// VIDEO_LIBRARY_SECTIONS
// Ordered section groupings for the /videos library page.
// Pulse-response videos (J4/J5/J6, G-Smooth/Rough/Water) are intentionally
// excluded — they surface via the pillar card button, not as browse-able content.
// ---------------------------------------------------------------------------
export const VIDEO_LIBRARY_SECTIONS: VideoLibrarySection[] = [
  {
    title:       'Clarity',
    description: 'The three foundation videos from your onboarding',
    videoIds:    ['CLARITY_1', 'CLARITY_2', 'CLARITY_3'],
  },
  {
    title:       'Getting Started',
    description: 'The why behind Living on Purpose',
    videoIds:    ['A1', 'A2', 'A3', 'A4'],
  },
  {
    title:       'The Five Pillars',
    description: 'An introduction to each area of your life',
    videoIds:    ['B1', 'B2', 'B3', 'B4', 'B5'],
  },
  {
    title:       'Duration Goals & the ACT Test',
    description: 'Why duration goals work — and how to write one that sticks',
    videoIds:    ['C1', 'C2', 'C3', 'C4'],
  },
  {
    title:       'Tuning — Daily Coaching',
    description: 'One video per day of your first 7-day window',
    videoIds:    ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'],
  },
  {
    title:       'Jamming',
    description: 'Coaching for your 14-day consistency window',
    videoIds:    ['J1', 'J2', 'J3', 'J7'],
  },
  {
    title:       'Grooving',
    description: 'Formation-level coaching for the long haul',
    videoIds:    ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G6b', 'G7', 'G8'],
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

// Returns today's date as YYYY-MM-DD in the given IANA timezone (e.g. 'America/Chicago').
// Use this in server components and API routes instead of todayStr(), passing the 'tz' cookie value.
// Falls back to the runtime timezone (UTC on Vercel) if tz is missing or unrecognised.
export function todayInTz(tz?: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', tz ? { timeZone: tz } : {}).format(new Date())
  } catch {
    return new Intl.DateTimeFormat('en-CA').format(new Date())
  }
}

// Adds n calendar days to a YYYY-MM-DD date string and returns a new YYYY-MM-DD string.
// Negative n moves backward. Use this instead of manual date arithmetic in components.
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

// Returns the 1-based day number within a challenge.
// Day 1 = start_date. Day 2 = start_date + 1. Etc.
export function getDayNumber(startDate: string, targetDate: string): number {
  const s = new Date(startDate + 'T00:00:00')
  const t = new Date(targetDate + 'T00:00:00')
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
export function rollingWindowDates(windowDays: number, endDate: string): string[] {
  const end = new Date(endDate + 'T00:00:00')
  const dates: string[] = []
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    dates.push(new Intl.DateTimeFormat('en-CA').format(d))
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

// Returns the effective challenge day number, accounting for paused days.
//
// While paused:  freezes at the day the challenge was paused (paused_at date),
//                minus any previously accumulated pause days (pause_days_used).
//                This prevents the day counter from advancing during a pause.
//
// While running: subtracts pause_days_used from the raw calendar day so the user
//                does not lose credit for days that were legitimately paused.
//
// pause_days_used is accumulated at resume time only — it does NOT include
// the current active pause (that gets added when the user resumes).
export function getEffectiveChallengeDay(challenge: {
  start_date:      string
  is_paused:       boolean
  paused_at:       string | null
  pause_days_used: number
}, viewingDate: string): number {
  if (challenge.is_paused && challenge.paused_at) {
    // Freeze the counter at the day the pause began
    const pausedOnDate = challenge.paused_at.slice(0, 10)
    const dayAtPause = getDayNumber(challenge.start_date, pausedOnDate)
    return Math.max(1, dayAtPause - challenge.pause_days_used)
  }
  const rawDay = getDayNumber(challenge.start_date, viewingDate)
  return Math.max(1, rawDay - challenge.pause_days_used)
}

// Returns the Sunday of the week containing dateStr, as YYYY-MM-DD.
// Used to anchor week grid navigation.
export function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - d.getDay()) // rewind to Sunday
  return new Intl.DateTimeFormat('en-CA').format(d)
}
