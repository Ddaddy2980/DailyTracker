// =============================================================================
// v2 TypeScript types
// All interfaces and unions for the level system live here.
// Existing v1 types (UserConfig, UserGoals, DailyEntry, PillarGoal) remain
// in /lib/constants.ts — do not move them until v1 is retired.
// =============================================================================

export interface UserProfile {
  id: string
  user_id: string
  current_level: number
  onboarding_completed: boolean
  purpose_statement: string | null
  selected_pillars: string[]
  accountability_user_id: string | null
  created_at: string
  updated_at: string
}

export interface Challenge {
  id: string
  user_id: string
  level: number
  duration_days: number
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'abandoned'
  pillar_goals: Record<string, unknown>
  days_completed: number
  consistency_pct: number
  created_at: string
  updated_at: string
}

export interface Reward {
  id: string
  user_id: string
  reward_type: RewardType
  challenge_id: string | null
  earned_at: string
}

export type RewardType =
  | 'starter_badge'
  | 'day1_complete'
  | 'day3_survival'
  | 'halfway'
  | 'day7_complete'
  | 'builder_badge'
  | 'consistent_badge'
  | 'refiner_badge'
  | 'guide_badge'

export type PillarName = 'spiritual' | 'physical' | 'nutritional' | 'personal'

export type LevelName = 'Starter' | 'Builder' | 'Consistent' | 'Refiner' | 'Guide'

// Lightweight entry type used by the challenge dashboard.
// Reads only the columns needed to determine per-pillar completion.
// v2 stores { challenge_complete: true } inside each JSONB pillar column.
export interface ChallengeEntry {
  entry_date:    string
  spiritual:     Record<string, unknown>
  physical_goals: Record<string, unknown>
  nutritional:   Record<string, unknown>
  personal:      Record<string, unknown>
}

// State of a single day on the 7-day challenge map
export type DayStatus = 'complete' | 'missed' | 'today' | 'future'

// Maps a numeric level to its display name
export const LEVEL_NAMES: Record<number, LevelName> = {
  1: 'Starter',
  2: 'Builder',
  3: 'Consistent',
  4: 'Refiner',
  5: 'Guide',
}
