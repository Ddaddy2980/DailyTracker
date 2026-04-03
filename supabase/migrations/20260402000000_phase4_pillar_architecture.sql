-- Phase 4: Pillar Architecture & Consistency Profile
-- Step 31 — Database Migration
-- Created: 2026-04-02

-- ============================================================
-- 1. Create pillar_levels table
-- ============================================================

CREATE TABLE IF NOT EXISTS pillar_levels (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          text        NOT NULL,
  pillar           text        NOT NULL, -- 'spiritual' | 'physical' | 'nutritional' | 'personal' | 'missional'
  level            integer     NOT NULL DEFAULT 1,
  operating_state  text        NOT NULL DEFAULT 'building',
  profile_score    integer,
  gauge_score      integer,
  assessed_at      timestamptz,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pillar_levels_user_pillar_unique UNIQUE (user_id, pillar)
);

ALTER TABLE pillar_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own pillar_levels"
  ON pillar_levels FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own pillar_levels"
  ON pillar_levels FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own pillar_levels"
  ON pillar_levels FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own pillar_levels"
  ON pillar_levels FOR DELETE
  USING (user_id = auth.uid()::text);

-- ============================================================
-- 2. Create consistency_profile_sessions table
-- ============================================================

CREATE TABLE IF NOT EXISTS consistency_profile_sessions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                text        NOT NULL,
  spiritual_score        integer     NOT NULL,
  physical_score         integer     NOT NULL,
  nutritional_score      integer     NOT NULL,
  personal_score         integer     NOT NULL,
  missional_score        integer     NOT NULL,
  focus_pillar_selected  text,
  completed_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consistency_profile_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own consistency_profile_sessions"
  ON consistency_profile_sessions FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own consistency_profile_sessions"
  ON consistency_profile_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own consistency_profile_sessions"
  ON consistency_profile_sessions FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own consistency_profile_sessions"
  ON consistency_profile_sessions FOR DELETE
  USING (user_id = auth.uid()::text);

-- ============================================================
-- 3. Create duration_goal_destinations table
-- ============================================================

CREATE TABLE IF NOT EXISTS duration_goal_destinations (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            text        NOT NULL,
  challenge_id       uuid        NOT NULL REFERENCES challenges(id),
  duration_goal_ref  text        NOT NULL,
  pillar             text        NOT NULL,
  direction_name     text        NOT NULL,
  frequency_target   integer     NOT NULL,
  frequency_unit     text        NOT NULL DEFAULT 'weekly',
  window_days        integer     NOT NULL,
  start_date         date        NOT NULL,
  end_date           date        NOT NULL,
  status             text        NOT NULL DEFAULT 'active',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE duration_goal_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own duration_goal_destinations"
  ON duration_goal_destinations FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own duration_goal_destinations"
  ON duration_goal_destinations FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own duration_goal_destinations"
  ON duration_goal_destinations FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own duration_goal_destinations"
  ON duration_goal_destinations FOR DELETE
  USING (user_id = auth.uid()::text);

-- ============================================================
-- 4. Add new columns to user_profile
-- ============================================================

ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS consistency_profile_completed boolean NOT NULL DEFAULT false;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS life_on_purpose_score integer;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS next_pillar_invitation_pillar text;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS last_pillar_check_at timestamptz;

-- ============================================================
-- 5. Add new column to challenges
-- ============================================================

ALTER TABLE challenges ADD COLUMN IF NOT EXISTS pillar_level_snapshot jsonb;

-- ============================================================
-- 6. Add new column to weekly_reflections
-- ============================================================

ALTER TABLE weekly_reflections ADD COLUMN IF NOT EXISTS sub_destination_statuses jsonb;
