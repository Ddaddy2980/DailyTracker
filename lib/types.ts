// =============================================================================
// v3 TypeScript types — Daily Consistency Tracker
// All interfaces and unions for the v3 per-pillar architecture.
// Database schema: supabase/migrations/20260410000000_v3_clean_schema.sql
//
// Rules:
//   - No `any` types — ever
//   - Use `interface` for objects and component props
//   - Use `type` for unions and primitives
//   - All Supabase table rows have a matching interface below
// =============================================================================


// =============================================================================
// Core unions and primitives
// =============================================================================

export type PillarName =
  | 'spiritual'
  | 'physical'
  | 'nutritional'
  | 'personal'
  | 'relational'

export type LevelNumber = 1 | 2 | 3 | 4

export type LevelName = 'Tuning' | 'Jamming' | 'Grooving' | 'Soloing'

// User-selectable total challenge lengths (14 is retired in v3)
export type ChallengeDuration = 21 | 30 | 60 | 90 | 100

export type ChallengeStatus = 'active' | 'completed' | 'abandoned'

export type DestinationGoalStatus = 'active' | 'completed' | 'released' | 'expired'

// Onboarding steps — each maps to a boolean gate column in user_profile
export type OnboardingStep =
  | 'duration'   // challenge_duration_selected
  | 'videos'     // clarity_videos_seen
  | 'profile'    // consistency_profile_completed
  | 'goals'      // goals_setup_completed
  | 'complete'   // onboarding_completed

// Per-goal completion map — stored as JSONB in pillar_daily_entries.goal_completions
// Keys are goal UUIDs (duration_goal or destination_goal), values are completion booleans.
// The `completed` boolean on the entry row is derived from duration goals only —
// destination goal keys in this map are stored for history but never affect `completed`.
export type GoalCompletions = Record<string, boolean>

// Status of a single day mark in the rolling window visualization inside a pillar card
export type DayMark = 'completed' | 'missed' | 'future'


// =============================================================================
// Table interfaces — map 1:1 to the v3 Supabase schema
// =============================================================================

export interface UserProfile {
  id:                            string
  user_id:                       string
  // Onboarding step gates — each flips to true when the step is completed
  challenge_duration_selected:   boolean
  clarity_videos_seen:           boolean
  consistency_profile_completed: boolean
  goals_setup_completed:         boolean
  onboarding_completed:          boolean
  // Points to the currently active challenge row; null until onboarding is done
  active_challenge_id:           string | null
  // Duration the user selected on the onboarding duration screen
  selected_duration_days:        number | null
  created_at:                    string
  updated_at:                    string
}

export interface Challenge {
  id:            string
  user_id:       string
  duration_days: ChallengeDuration   // 21 | 30 | 60 | 90 | 100
  start_date:    string              // ISO date YYYY-MM-DD
  status:        ChallengeStatus
  completed_at:  string | null
  created_at:    string
}

export interface PillarLevel {
  id:            string
  user_id:       string
  pillar:        PillarName
  level:         LevelNumber         // 1=Tuning 2=Jamming 3=Grooving 4=Soloing
  is_active:     boolean             // false = Dormant (no active duration goal)
  profile_score: number | null       // 0–12 from Consistency Profile; null if skipped
  created_at:    string
  updated_at:    string
}

export interface DurationGoal {
  id:         string
  user_id:    string
  pillar:     PillarName
  goal_text:  string
  is_active:  boolean    // false = soft-deleted; preserves history for rolling window
  created_at: string
  updated_at: string
}

export interface DestinationGoal {
  id:               string
  user_id:          string
  pillar:           PillarName
  goal_text:        string
  frequency_target: number | null    // e.g. 3 (times per window)
  time_window_days: number | null    // e.g. 30 (day window for frequency target)
  status:           DestinationGoalStatus
  start_date:       string | null    // ISO date
  end_date:         string | null    // ISO date
  created_at:       string
  updated_at:       string
}

export interface PillarDailyEntry {
  id:               string
  user_id:          string
  challenge_id:     string
  pillar:           PillarName
  entry_date:       string           // ISO date YYYY-MM-DD
  completed:        boolean          // true when ALL active duration goals were hit
  goal_completions: GoalCompletions  // { [duration_goal_id]: true|false }
  created_at:       string
  updated_at:       string
}

export interface ConsistencyProfileSession {
  id:                string
  user_id:           string
  spiritual_score:   number    // 0–12
  physical_score:    number    // 0–12
  nutritional_score: number    // 0–12
  personal_score:    number    // 0–12
  relational_score:  number    // 0–12
  is_reassessment:   boolean   // true for every session after the first
  created_at:        string
}


// =============================================================================
// Composite / derived types — not stored in DB; built in application code
// =============================================================================

// Per-pillar score map produced by the Consistency Profile flow
export type PillarScores = Record<PillarName, number>

// Result of evaluating a rolling window threshold for one pillar
export interface RollingWindowResult {
  pillar:        PillarName
  currentLevel:  LevelNumber
  completions:   number           // how many completions fall in the rolling window
  windowDays:    number           // size of the window evaluated (7, 14, or 60)
  required:      number           // completions needed to advance (4, 10, or 48)
  shouldAdvance: boolean          // completions >= required
  nextLevel:     LevelNumber | null  // null when already at Level 4 (Soloing)
}

// Full state for one pillar card on the dashboard
// Built server-side per active pillar, passed to the appropriate card component
export interface PillarCardState {
  pillar:           PillarName
  level:            LevelNumber
  isActive:         boolean
  durationGoals:    DurationGoal[]
  destinationGoals: DestinationGoal[]    // always empty for Tuning and Jamming
  todayEntry:       PillarDailyEntry | null
  // Last N entries for the rolling window visualization
  // Tuning cards: last 7. Jamming cards: last 14. Grooving/Soloing: empty.
  recentEntries:    PillarDailyEntry[]
}

// Full dashboard data — assembled once server-side, passed down to client
export interface DashboardData {
  challenge:    Challenge
  pillarLevels: PillarLevel[]
  pillarCards:  PillarCardState[]
  currentDay:   number    // 1-based: Math.floor((today - start_date) / 1 day) + 1
}

// Onboarding goal setup — one entry per pillar, built on the goals screen
export interface OnboardingPillarGoal {
  pillar:    PillarName
  level:     LevelNumber
  goalText:  string    // free-text duration goal; '' means user left this pillar dormant
  activate:  boolean   // true when user wants this pillar active
}

// Video entry — clarity videos and per-level coaching videos
// url: '' while not yet recorded — renders a "Coming soon" placeholder
export type VideoModule = 'clarity' | 'tuning' | 'jamming' | 'grooving' | 'soloing'

export interface VideoEntry {
  id:      string
  title:   string
  url:     string        // YouTube embed URL or '' for placeholder
  module:  VideoModule
  trigger: string        // logical trigger name for wiring
}
