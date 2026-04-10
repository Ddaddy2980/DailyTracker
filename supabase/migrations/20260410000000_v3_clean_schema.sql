-- =============================================================================
-- v3 Clean Schema Migration
-- Daily Consistency Tracker — Per-Pillar Architecture
-- Branch: v3-phase1
-- Date: 2026-04-10
--
-- This migration drops all v2 tables and creates a clean v3 schema.
-- Run this against a fresh Supabase project or after manually clearing
-- all existing data and tables.
--
-- Table overview:
--   user_profile              — One row per user. Onboarding and challenge state.
--   challenges                — One row per challenge attempt. User-chosen duration.
--   pillar_levels             — One row per user per pillar. Level and active state.
--   duration_goals            — Per-pillar duration goals. Level-capped at save time.
--   destination_goals         — Per-pillar destination goals. Grooving+ only.
--   pillar_daily_entries      — One row per user/pillar/date. Source of truth for rolling windows.
--   consistency_profile_sessions — Snapshot of pillar scores from each profile assessment.
-- =============================================================================


-- =============================================================================
-- DROP ALL V2 TABLES (clean slate)
-- =============================================================================

DROP TABLE IF EXISTS group_daily_status CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS consistency_groups CASCADE;
DROP TABLE IF EXISTS grooving_circle_members CASCADE;
DROP TABLE IF EXISTS duration_goal_destinations CASCADE;
DROP TABLE IF EXISTS weekly_reflections CASCADE;
DROP TABLE IF EXISTS challenge_pauses CASCADE;
DROP TABLE IF EXISTS pulse_checks CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS video_progress CASCADE;
DROP TABLE IF EXISTS daily_reflections CASCADE;
DROP TABLE IF EXISTS pillar_levels CASCADE;
DROP TABLE IF EXISTS consistency_profile_sessions CASCADE;
DROP TABLE IF EXISTS destination_goals CASCADE;
DROP TABLE IF EXISTS duration_goals CASCADE;
DROP TABLE IF EXISTS pillar_daily_entries CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;
DROP TABLE IF EXISTS user_profile CASCADE;


-- =============================================================================
-- UTILITY: updated_at trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- TABLE: user_profile
-- One row per authenticated user (Clerk user_id).
-- Tracks onboarding progress and points to the active challenge.
-- =============================================================================

CREATE TABLE user_profile (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       text UNIQUE NOT NULL,

  -- Onboarding state (each step gates the next)
  challenge_duration_selected   boolean NOT NULL DEFAULT false,
  clarity_videos_seen           boolean NOT NULL DEFAULT false,
  consistency_profile_completed boolean NOT NULL DEFAULT false,
  goals_setup_completed         boolean NOT NULL DEFAULT false,
  onboarding_completed          boolean NOT NULL DEFAULT false,

  -- Active challenge (null until onboarding is complete)
  active_challenge_id           uuid,

  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER user_profile_updated_at
  BEFORE UPDATE ON user_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profile FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role can manage all profiles"
  ON user_profile FOR ALL
  USING (true);


-- =============================================================================
-- TABLE: challenges
-- One row per challenge attempt. The container that all pillar activity lives in.
-- duration_days is always one of: 21, 30, 60, 90, 100.
-- =============================================================================

CREATE TABLE challenges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL,
  duration_days integer NOT NULL CHECK (duration_days IN (21, 30, 60, 90, 100)),
  start_date    date NOT NULL,
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'abandoned')),
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX challenges_user_id_idx ON challenges (user_id);
CREATE INDEX challenges_status_idx ON challenges (user_id, status);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own challenges"
  ON challenges FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role can manage all challenges"
  ON challenges FOR ALL
  USING (true);


-- =============================================================================
-- TABLE: pillar_levels
-- One row per user per pillar (5 rows total per user after onboarding).
-- level:        1 = Tuning, 2 = Jamming, 3 = Grooving, 4 = Soloing
-- is_active:    false = Dormant (user has not set a duration goal for this pillar)
-- profile_score: 0–12 from the Consistency Profile (null if skipped)
-- =============================================================================

CREATE TABLE pillar_levels (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL,
  pillar        text NOT NULL
                  CHECK (pillar IN ('spiritual', 'physical', 'nutritional', 'personal', 'relational')),
  level         integer NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 4),
  is_active     boolean NOT NULL DEFAULT false,
  profile_score integer CHECK (profile_score BETWEEN 0 AND 12),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, pillar)
);

CREATE TRIGGER pillar_levels_updated_at
  BEFORE UPDATE ON pillar_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX pillar_levels_user_id_idx ON pillar_levels (user_id);

ALTER TABLE pillar_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pillar levels"
  ON pillar_levels FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role can manage all pillar levels"
  ON pillar_levels FOR ALL
  USING (true);


-- =============================================================================
-- TABLE: duration_goals
-- Per-pillar duration goals. Level caps are enforced in application code.
--   Tuning:  max 1 goal
--   Jamming: max 2 goals
--   Grooving: max 3 goals
--   Soloing: max 4 goals
-- is_active: false when goal is removed (soft delete to preserve history)
-- =============================================================================

CREATE TABLE duration_goals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,
  pillar      text NOT NULL
                CHECK (pillar IN ('spiritual', 'physical', 'nutritional', 'personal', 'relational')),
  goal_text   text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER duration_goals_updated_at
  BEFORE UPDATE ON duration_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX duration_goals_user_pillar_idx ON duration_goals (user_id, pillar, is_active);

ALTER TABLE duration_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own duration goals"
  ON duration_goals FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role can manage all duration goals"
  ON duration_goals FOR ALL
  USING (true);


-- =============================================================================
-- TABLE: destination_goals
-- Per-pillar destination goals. Only available at Grooving (level 3) and above.
--   Grooving: max 3 per pillar
--   Soloing:  unlimited
-- status: active → completed | released | expired
-- =============================================================================

CREATE TABLE destination_goals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text NOT NULL,
  pillar            text NOT NULL
                      CHECK (pillar IN ('spiritual', 'physical', 'nutritional', 'personal', 'relational')),
  goal_text         text NOT NULL,
  frequency_target  integer,
  time_window_days  integer CHECK (time_window_days BETWEEN 1 AND 100),
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'completed', 'released', 'expired')),
  start_date        date,
  end_date          date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER destination_goals_updated_at
  BEFORE UPDATE ON destination_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX destination_goals_user_pillar_idx ON destination_goals (user_id, pillar, status);

ALTER TABLE destination_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own destination goals"
  ON destination_goals FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role can manage all destination goals"
  ON destination_goals FOR ALL
  USING (true);


-- =============================================================================
-- TABLE: pillar_daily_entries
-- One row per user / pillar / date. The source of truth for rolling window
-- advancement calculations and the pillar card check-in state.
--
-- completed:       true when ALL active duration goals for this pillar were hit
-- goal_completions: JSONB object — { "<duration_goal_id>": true|false, ... }
--                  Captures per-goal completion state for display when card reopened
-- =============================================================================

CREATE TABLE pillar_daily_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          text NOT NULL,
  challenge_id     uuid NOT NULL REFERENCES challenges (id),
  pillar           text NOT NULL
                     CHECK (pillar IN ('spiritual', 'physical', 'nutritional', 'personal', 'relational')),
  entry_date       date NOT NULL,
  completed        boolean NOT NULL DEFAULT false,
  goal_completions jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, pillar, entry_date)
);

CREATE TRIGGER pillar_daily_entries_updated_at
  BEFORE UPDATE ON pillar_daily_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Primary query: rolling window per user/pillar over a date range
CREATE INDEX pillar_daily_entries_rolling_idx
  ON pillar_daily_entries (user_id, pillar, entry_date DESC);

-- Secondary query: all pillars for a user on a given date (daily dashboard load)
CREATE INDEX pillar_daily_entries_date_idx
  ON pillar_daily_entries (user_id, entry_date);

ALTER TABLE pillar_daily_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily entries"
  ON pillar_daily_entries FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role can manage all daily entries"
  ON pillar_daily_entries FOR ALL
  USING (true);


-- =============================================================================
-- TABLE: consistency_profile_sessions
-- One row per time a user completes the Consistency Profile.
-- is_reassessment: true for every session after the first.
-- Scores are 0–12 per pillar (4 questions × 0–3 pts each).
-- =============================================================================

CREATE TABLE consistency_profile_sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            text NOT NULL,
  spiritual_score    integer NOT NULL CHECK (spiritual_score BETWEEN 0 AND 12),
  physical_score     integer NOT NULL CHECK (physical_score BETWEEN 0 AND 12),
  nutritional_score  integer NOT NULL CHECK (nutritional_score BETWEEN 0 AND 12),
  personal_score     integer NOT NULL CHECK (personal_score BETWEEN 0 AND 12),
  relational_score   integer NOT NULL CHECK (relational_score BETWEEN 0 AND 12),
  is_reassessment    boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX consistency_profile_sessions_user_idx
  ON consistency_profile_sessions (user_id, created_at DESC);

ALTER TABLE consistency_profile_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile sessions"
  ON consistency_profile_sessions FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role can manage all profile sessions"
  ON consistency_profile_sessions FOR ALL
  USING (true);


-- =============================================================================
-- FOREIGN KEY: user_profile → challenges (added after both tables exist)
-- =============================================================================

ALTER TABLE user_profile
  ADD CONSTRAINT user_profile_active_challenge_fk
  FOREIGN KEY (active_challenge_id) REFERENCES challenges (id);


-- =============================================================================
-- SCORE → LEVEL mapping reference (enforced in application code, not DB)
-- =============================================================================
-- Profile Score | Level | Name
-- 0  – 3        |   1   | Tuning
-- 4  – 6        |   2   | Jamming
-- 7  – 9        |   3   | Grooving
-- 10 – 12       |   4   | Soloing
--
-- Rolling window advancement thresholds (per pillar):
--   Tuning  → Jamming:  4 completions in rolling last-7-day  window
--   Jamming → Grooving: 10 completions in rolling last-14-day window
--   Grooving → Soloing: 48 completions in rolling last-60-day window
--
-- Duration goal caps per level (enforced in application code):
--   Tuning:   max 1
--   Jamming:  max 2
--   Grooving: max 3
--   Soloing:  max 4
--
-- Destination goal caps per level (enforced in application code):
--   Grooving: max 3 per pillar
--   Soloing:  unlimited
-- =============================================================================
