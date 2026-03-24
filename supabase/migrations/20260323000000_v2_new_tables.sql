-- =============================================================================
-- Migration: v2 new tables
-- Date: 2026-03-23
-- Description: Adds user_profile, challenges, video_progress, daily_reflections,
--              and rewards tables for the v2 level system.
--              Does NOT modify any existing tables.
-- =============================================================================


-- ─── 1. user_profile ─────────────────────────────────────────────────────────
-- One row per user. Tracks level, onboarding state, purpose statement,
-- selected pillars, and optional accountability partner.

CREATE TABLE IF NOT EXISTS user_profile (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                text UNIQUE NOT NULL,          -- Clerk user ID
  current_level          integer NOT NULL DEFAULT 1,
  onboarding_completed   boolean NOT NULL DEFAULT false,
  purpose_statement      text,
  selected_pillars       jsonb NOT NULL DEFAULT '[]'::jsonb,
  accountability_user_id text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_profile_level_check CHECK (current_level BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS user_profile_user_id_idx ON user_profile (user_id);


-- ─── 2. challenges ───────────────────────────────────────────────────────────
-- One row per challenge attempt. Records the level, duration, date range,
-- status, a snapshot of goals at start, and running completion stats.

CREATE TABLE IF NOT EXISTS challenges (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          text NOT NULL,                        -- Clerk user ID
  level            integer NOT NULL,
  duration_days    integer NOT NULL,
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  status           text NOT NULL DEFAULT 'active',
  pillar_goals     jsonb NOT NULL DEFAULT '{}'::jsonb,  -- snapshot at challenge start
  days_completed   integer NOT NULL DEFAULT 0,
  consistency_pct  numeric(5, 2) NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT challenges_status_check
    CHECK (status IN ('active', 'completed', 'abandoned')),
  CONSTRAINT challenges_level_check
    CHECK (level BETWEEN 1 AND 5),
  CONSTRAINT challenges_days_check
    CHECK (days_completed >= 0),
  CONSTRAINT challenges_pct_check
    CHECK (consistency_pct BETWEEN 0 AND 100),
  CONSTRAINT challenges_dates_check
    CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS challenges_user_id_idx    ON challenges (user_id);
CREATE INDEX IF NOT EXISTS challenges_user_status_idx ON challenges (user_id, status);


-- ─── 3. video_progress ───────────────────────────────────────────────────────
-- One row per video watch event per user. video_id maps to the VIDEO_LIBRARY
-- constant in /lib/constants.ts (e.g. 'A1', 'D3').

CREATE TABLE IF NOT EXISTS video_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      text NOT NULL,    -- Clerk user ID
  video_id     text NOT NULL,    -- e.g. 'A1', 'B2', 'D7'
  watched_at   timestamptz NOT NULL DEFAULT now(),
  triggered_by text,             -- 'onboarding', 'day_1', 'day_3', etc.

  CONSTRAINT video_progress_unique UNIQUE (user_id, video_id)
);

CREATE INDEX IF NOT EXISTS video_progress_user_id_idx ON video_progress (user_id);


-- ─── 4. daily_reflections ────────────────────────────────────────────────────
-- One optional reflection per user per day of a challenge.

CREATE TABLE IF NOT EXISTS daily_reflections (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          text NOT NULL,   -- Clerk user ID
  challenge_id     uuid NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
  day_number       integer NOT NULL,
  reflection_text  text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT daily_reflections_day_check CHECK (day_number >= 1),
  CONSTRAINT daily_reflections_unique UNIQUE (user_id, challenge_id, day_number)
);

CREATE INDEX IF NOT EXISTS daily_reflections_user_id_idx      ON daily_reflections (user_id);
CREATE INDEX IF NOT EXISTS daily_reflections_challenge_id_idx ON daily_reflections (challenge_id);


-- ─── 5. rewards ──────────────────────────────────────────────────────────────
-- One row per reward earned. reward_type values must match the RewardType
-- union defined in /lib/types.ts.

CREATE TABLE IF NOT EXISTS rewards (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      text NOT NULL,   -- Clerk user ID
  reward_type  text NOT NULL,
  challenge_id uuid REFERENCES challenges (id) ON DELETE SET NULL,
  earned_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rewards_type_check CHECK (
    reward_type IN (
      'starter_badge',
      'day1_complete',
      'day3_survival',
      'halfway',
      'day7_complete',
      'builder_badge',
      'consistent_badge',
      'refiner_badge',
      'guide_badge'
    )
  ),
  -- A user can only earn each reward type once per challenge
  CONSTRAINT rewards_unique UNIQUE (user_id, reward_type, challenge_id)
);

CREATE INDEX IF NOT EXISTS rewards_user_id_idx ON rewards (user_id);


-- ─── updated_at triggers ─────────────────────────────────────────────────────
-- Auto-update updated_at on any row change for tables that carry that column.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_profile_updated_at
  BEFORE UPDATE ON user_profile
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── Row Level Security ───────────────────────────────────────────────────────
-- RLS is enabled on all tables. The app uses the Supabase service role key
-- server-side (which bypasses RLS), but RLS is enabled as a safety layer.
-- Policies permit a user to access only their own rows.

ALTER TABLE user_profile       ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reflections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards            ENABLE ROW LEVEL SECURITY;

-- user_profile
CREATE POLICY "user_profile: own rows only"
  ON user_profile FOR ALL
  USING (user_id = auth.uid()::text);

-- challenges
CREATE POLICY "challenges: own rows only"
  ON challenges FOR ALL
  USING (user_id = auth.uid()::text);

-- video_progress
CREATE POLICY "video_progress: own rows only"
  ON video_progress FOR ALL
  USING (user_id = auth.uid()::text);

-- daily_reflections
CREATE POLICY "daily_reflections: own rows only"
  ON daily_reflections FOR ALL
  USING (user_id = auth.uid()::text);

-- rewards
CREATE POLICY "rewards: own rows only"
  ON rewards FOR ALL
  USING (user_id = auth.uid()::text);
