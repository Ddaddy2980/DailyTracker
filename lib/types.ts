// =============================================================================
// v2 TypeScript types
// All interfaces and unions for the level system live here.
// Existing v1 types (UserConfig, UserGoals, DailyEntry, PillarGoal) remain
// in /lib/constants.ts — do not move them until v1 is retired.
// =============================================================================

export interface UserProfile {
  id: string
  user_id: string
  name: string | null
  current_level: number
  onboarding_completed: boolean
  purpose_statement: string | null
  selected_pillars: string[]
  accountability_user_id: string | null
  notification_tier: 'minimal' | 'standard' | 'full'
  last_pulse_check_at: string | null
  accountability_partner_name: string | null
  accountability_partner_contact: string | null
  focus_list_25: string[] | null
  focus_top_5: FocusTop5Item[] | null
  what_changed_reflection: string | null
  rooted_milestone_fired: boolean
  rooted_milestone_date: string | null
  rooted_goal_id: string | null
  // Step 29 — Grooving notification system
  last_pattern_alert_at: string | null
  // Step 16g — ephemeral join notification flag written by joinGroup
  pending_join_notification: PendingJoinNotification | null
  created_at: string
  updated_at: string
  // Continuous journey architecture
  journey_start_date:    string | null
  journey_total_days:    number | null
  journey_level_preview: JourneyLevelPreview[]
  // Phase 4 — Pillar Architecture
  consistency_profile_completed:  boolean
  life_on_purpose_score:          number | null
  next_pillar_invitation_pillar:  string | null
  last_pillar_check_at:           string | null
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
  carried_forward_pillars: string[]
  days_completed: number
  consistency_pct: number
  // Step 27 — life interruption pause system (Grooving only)
  is_paused:  boolean   // current pause state; cleared on resume
  pause_used: boolean   // one-way flag; stays true after resume to enforce one-pause rule
  created_at: string
  updated_at: string
  // Continuous journey architecture — null/default on legacy rows (is_continuous = false)
  is_continuous:             boolean
  journey_current_level:     number
  journey_level_history:     Record<string, string>  // { "2": "2026-04-08" }
  tuning_days_completed:     number
  tuning_evaluation_done:    boolean
  jamming_phase1_completed:  boolean
  jamming_phase2_unlocked:   boolean
  jamming_phase2_accepted:   boolean
  pending_journey_event:     PendingJourneyEvent | null
  // Phase 4 — Pillar Architecture
  pillar_level_snapshot: Record<string, { level: number; state: OperatingState }> | null
}

// Step 27 — one row per pause attempt; written by pauseChallenge, closed by resumeChallenge.
export interface ChallengePause {
  id:           string
  user_id:      string
  challenge_id: string
  pause_reason: string         // 'travel' | 'illness' | 'family' | 'work' | 'other'
  paused_at:    string         // ISO timestamptz
  resumed_at:   string | null  // null while paused
  days_paused:  number | null  // ceiling of hours paused; null until resume
}

export interface Reward {
  id: string
  user_id: string
  reward_type: RewardType
  challenge_id: string | null
  earned_at: string
}

export type RewardType =
  | 'tuning_badge'
  | 'day1_complete'
  | 'day3_survival'
  | 'halfway'
  | 'day7_complete'
  | 'jamming_badge'
  | 'rooted_badge'
  | 'grooving_badge'
  | 'soloing_badge'
  | 'orchestrating_badge'

export type PillarName = 'spiritual' | 'physical' | 'nutritional' | 'personal' | 'missional'

export type LevelName = 'Tuning' | 'Jamming' | 'Grooving' | 'Soloing' | 'Orchestrating'

// Phase 4 — Pillar Architecture
export type OperatingState = 'anchored' | 'developing' | 'building' | 'dormant'

export interface PillarLevel {
  id:              string
  user_id:         string
  pillar:          PillarName
  level:           number
  operating_state: OperatingState
  profile_score:   number | null
  gauge_score:     number | null
  assessed_at:     string | null
  updated_at:      string
}

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

// State of a single day on the challenge map
export type DayStatus = 'complete' | 'missed' | 'today' | 'future'

// Pulse check types (Jamming level)
export type PulseState   = 'smooth_sailing' | 'rough_waters' | 'taking_on_water'
export type PulseTrigger = 'scheduled_weekly' | 'missed_day' | 'partial_completion'

export interface PulseCheck {
  id:           string
  user_id:      string
  challenge_id: string
  week_number:  number
  pulse_state:  PulseState
  trigger_type: PulseTrigger
  recorded_at:  string
}

// Pending pulse check — returned when a check is due (not yet recorded)
export interface PendingPulseCheck {
  weekNumber:  number
  triggerType: PulseTrigger
}

// Maps a numeric level to its display name
export const LEVEL_NAMES: Record<number, LevelName> = {
  1: 'Tuning',
  2: 'Jamming',
  3: 'Grooving',
  4: 'Soloing',
  5: 'Orchestrating',
}

// 25/5 Focus Exercise (Grooving level — Step 24)
// Stored as JSONB in user_profile.focus_top_5, ordered by rank.
export interface FocusTop5Item {
  rank: number
  text: string
}

// Destination goals (Grooving level — Step 23)
// Maps to the legacy destination_goals table — preserved for Grooving-level UI.
// One per pillar max. Directional only — no granular progress tracking.
// Gate: user_profile.rooted_milestone_fired must be true before setup is accessible.
export type DestinationGoalStatus = 'active' | 'reached' | 'released'

export interface DestinationGoal {
  id:              string
  user_id:         string
  challenge_id:    string
  pillar:          string
  goal_name:       string
  target_date:     string | null
  focus_item_rank: number | null
  status:          DestinationGoalStatus
  created_at:      string
  updated_at:      string
}

// Phase 5 destination goals — duration_goal_destinations table (Step 43+)
// Available at Grooving level and above. Ride alongside duration habits.
// Named separately from DestinationGoal to avoid conflict with the legacy table.
export type DurationGoalDestinationStatus = 'active' | 'completed' | 'released' | 'expired'

export interface DurationGoalDestination {
  id:               string
  user_id:          string
  challenge_id:     string
  pillar:           string
  goal_name:        string
  frequency_target: number
  frequency_unit:   string
  window_days:      number
  start_date:       string
  end_date:         string
  status:           DurationGoalDestinationStatus
  created_at:       string
  updated_at:       string
}

// Weekly reflection (Grooving level — Step 25)
// One row per week per challenge. Stores reflection answer + pulse state + destination goal check-in.
export type DestinationGoalCheckInStatus = 'yes' | 'slowly' | 'no'

export interface WeeklyReflection {
  id:                      string
  user_id:                 string
  challenge_id:            string
  week_number:             number
  reflection_question:     string
  reflection_answer:       string | null
  destination_goal_status: DestinationGoalCheckInStatus | null
  share_with_circle:       boolean
  created_at:              string
}

// =============================================================================
// Consistency Groups — Phase 2.5 (Step 16b)
// Three table interfaces + one composite type for the group dashboard query.
// =============================================================================

// Step 16g — ephemeral JSONB flag written to user_profile by joinGroup.
// Cleared (seenAt set to ISO string) when the creator dismisses the banner.
export interface PendingJoinNotification {
  memberName: string
  groupName:  string
  seenAt:     string | null
}

// Step 16g — JSONB flag written to consistency_groups when all active members
// reach completion_status='full' for the day.  notified flips to true after the
// full-group-day banner renders once; date provides the implicit 24-hour expiry.
export interface GroupDailyFlags {
  date:     string   // ISO date e.g. '2026-03-29'
  notified: boolean
}

// Lifecycle states for a consistency group.
// active   — running normally
// paused   — temporarily suspended by creator; can be resumed
// archived — preserved with history; creator can reactivate
// deleted  — permanent; treated as gone
export type GroupStatus = 'active' | 'paused' | 'archived' | 'deleted'

export interface ConsistencyGroup {
  id:                 string
  name:               string
  created_by:         string    // Clerk user_id of creator
  invite_code:        string    // format: [WORD]-[4CHARS] e.g. 'RIVER-4K2M'
  invite_url_enabled: boolean
  max_members:        number
  created_at:         string
  status:             GroupStatus
  archived_at:        string | null
  // Step 16g — full-group-day celebration flag; null until first full day
  group_daily_flags:  GroupDailyFlags | null
}

export interface GroupMember {
  id:           string
  group_id:     string
  user_id:      string          // Clerk user_id
  display_name: string          // snapshot at join time — not live-synced
  joined_at:    string
  active:       boolean
  // Computed client-side when rendering the member list.
  // true when this member's user_id matches the signed-in user.
  // Drives the 'always first, slightly highlighted' display rule.
  isCurrentUser?: boolean
}

// The three legal values for group_daily_status.completion_status.
// Matches the CHECK constraint in the migration exactly.
export type CompletionStatus = 'full' | 'partial' | 'none'

export interface GroupDailyStatus {
  id:                string
  group_id:          string
  user_id:           string
  status_date:       string     // ISO date string e.g. '2026-03-27'
  completion_status: CompletionStatus
  streak_count:      number
  active_pillars:    string[]
  updated_at:        string
}

// Composite type returned by the group dashboard query (Step 16c+).
// Each member is extended with their GroupDailyStatus for today, or null
// if no check-in has been recorded yet.
export interface GroupMemberWithStatus extends GroupMember {
  todayStatus: GroupDailyStatus | null
}

// The full shape consumed by every group dashboard component.
// Built once in the server page and passed down — no per-component queries needed.
export interface GroupWithMembers extends ConsistencyGroup {
  members: GroupMemberWithStatus[]
  // Step 16g — current user's pending join notification, fetched alongside group data.
  // Non-null only for the creator when a member joined since the last dismissal.
  pendingJoinNotification: PendingJoinNotification | null
}

export type VideoModule = 'A' | 'B' | 'C' | 'D' | 'J' | 'G'

export interface VideoEntry {
  id:               string        // e.g. 'A1', 'D3', 'G_RETURN'
  module:           VideoModule
  title:            string
  url:              string        // embed URL, or '' for coming-soon
  pillar?:          PillarName    // only on B-module videos
  duration?:        string        // e.g. '8 min' — optional, shown when url is live
  trigger?:         string        // logical trigger name — used for wiring and filtering
  duration_seconds?: number       // raw seconds — optional, for progress bars / analytics
}

// =============================================================================
// Continuous Journey Architecture — Part B
// =============================================================================

// One entry in the journey level preview array stored on user_profile.
// Describes which level is active during a day range of the full journey.
export interface JourneyLevelPreview {
  level: number
  name:  LevelName
  days:  string   // e.g. "1-7", "8-21", "22-66"
}

// The two evaluation event types that can be written to pending_journey_event.
export type PendingJourneyEventType = 'tuning_evaluation' | 'jamming_phase2_offer'

// JSONB shape written to challenges.pending_journey_event.
// Null on the challenge row when nothing is pending acknowledgment.
export interface PendingJourneyEvent {
  type:     PendingJourneyEventType
  // Present when type = 'tuning_evaluation'
  outcome?: TuningOutcome
  message?: TuningMessage
  // Present when type = 'jamming_phase2_offer'
  unlock?:  boolean
}

// Outcome variants returned by evaluateTuningCompletion.
export type TuningOutcome = 'advance' | 'grace_advance' | 'reset_offer'

// UI message variant — maps 1:1 to TuningOutcome; kept separate so the
// engine and the UI can evolve independently.
export type TuningMessage = 'full_celebration' | 'grace_passage' | 'pastoral_reset'

export interface TuningEvaluationResult {
  outcome: TuningOutcome
  message: TuningMessage
}

export interface JammingPhase1Result {
  unlock_phase2: boolean
}

// Complete journey status object consumed by the dashboard and routing logic.
export interface JourneyStatus {
  currentDay:              number
  currentLevel:            number
  levelName:               LevelName
  // How many days the user has been inside the current level (1-based).
  daysInCurrentLevel:      number
  totalDays:               number
  // true for legacy (is_continuous = false) challenges — no advancement fires.
  isLegacy:                boolean
  // true when pending_journey_event.type === 'tuning_evaluation' and the user
  // has not yet acknowledged the result.
  tuningEvaluationPending: boolean
  // true when jamming_phase2_unlocked = true (offer threshold met at Day 14).
  jammingPhase2Available:  boolean
}
