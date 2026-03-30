-- =============================================================================
-- Grooving Level Migration
-- 1. Add grooving_circle_members table
-- 2. Add destination_goals table
-- 3. Add weekly_reflections table
-- 4. Add challenge_pauses table
-- 5. Add 6 new user_profile fields
-- 6. Add rooted_badge to rewards constraint
-- =============================================================================


-- ── 1. grooving_circle_members ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS grooving_circle_members (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        text NOT NULL,
  member_name    text NOT NULL,
  member_contact text NOT NULL,
  added_at       timestamptz NOT NULL DEFAULT now(),
  active         boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS grooving_circle_members_user_id_idx ON grooving_circle_members (user_id);

ALTER TABLE grooving_circle_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grooving_circle_members: own rows only"
  ON grooving_circle_members FOR ALL
  USING (user_id = auth.uid()::text);


-- ── 2. destination_goals ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS destination_goals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          text NOT NULL,
  challenge_id     uuid REFERENCES challenges (id) ON DELETE CASCADE,
  pillar           text NOT NULL,
  goal_name        text NOT NULL,
  target_date      date,
  focus_item_rank  integer,
  status           text NOT NULL DEFAULT 'active',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT destination_goals_pillar_check
    CHECK (pillar IN ('spiritual', 'physical', 'nutritional', 'personal')),
  CONSTRAINT destination_goals_status_check
    CHECK (status IN ('active', 'reached', 'released')),
  CONSTRAINT destination_goals_focus_rank_check
    CHECK (focus_item_rank IS NULL OR focus_item_rank BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS destination_goals_user_id_idx      ON destination_goals (user_id);
CREATE INDEX IF NOT EXISTS destination_goals_challenge_id_idx ON destination_goals (challenge_id);

ALTER TABLE destination_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "destination_goals: own rows only"
  ON destination_goals FOR ALL
  USING (user_id = auth.uid()::text);


-- ── 3. weekly_reflections ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weekly_reflections (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 text NOT NULL,
  challenge_id            uuid REFERENCES challenges (id) ON DELETE CASCADE,
  week_number             integer NOT NULL,
  reflection_question     text NOT NULL,
  reflection_answer       text,
  destination_goal_status text,
  share_with_circle       boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT weekly_reflections_dest_status_check
    CHECK (destination_goal_status IS NULL OR destination_goal_status IN ('yes', 'slowly', 'no'))
);

CREATE INDEX IF NOT EXISTS weekly_reflections_user_id_idx      ON weekly_reflections (user_id);
CREATE INDEX IF NOT EXISTS weekly_reflections_challenge_id_idx ON weekly_reflections (challenge_id);

ALTER TABLE weekly_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_reflections: own rows only"
  ON weekly_reflections FOR ALL
  USING (user_id = auth.uid()::text);


-- ── 4. challenge_pauses ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenge_pauses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      text NOT NULL,
  challenge_id uuid REFERENCES challenges (id) ON DELETE CASCADE,
  pause_reason text NOT NULL,
  paused_at    timestamptz NOT NULL DEFAULT now(),
  resumed_at   timestamptz,
  days_paused  integer,

  CONSTRAINT challenge_pauses_reason_check
    CHECK (pause_reason IN ('travel', 'illness', 'family', 'work', 'other'))
);

CREATE INDEX IF NOT EXISTS challenge_pauses_user_id_idx      ON challenge_pauses (user_id);
CREATE INDEX IF NOT EXISTS challenge_pauses_challenge_id_idx ON challenge_pauses (challenge_id);

ALTER TABLE challenge_pauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenge_pauses: own rows only"
  ON challenge_pauses FOR ALL
  USING (user_id = auth.uid()::text);


-- ── 5. user_profile new columns ──────────────────────────────────────────────

ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS focus_list_25           jsonb,
  ADD COLUMN IF NOT EXISTS focus_top_5             jsonb,
  ADD COLUMN IF NOT EXISTS what_changed_reflection text,
  ADD COLUMN IF NOT EXISTS rooted_milestone_fired  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rooted_milestone_date   date,
  ADD COLUMN IF NOT EXISTS rooted_goal_id          text;


-- ── 6. Add rooted_badge to rewards constraint ─────────────────────────────────

ALTER TABLE rewards DROP CONSTRAINT IF EXISTS rewards_type_check;

ALTER TABLE rewards ADD CONSTRAINT rewards_type_check CHECK (
  reward_type IN (
    'tuning_badge',
    'day1_complete',
    'day3_survival',
    'halfway',
    'day7_complete',
    'jamming_badge',
    'rooted_badge',
    'grooving_badge',
    'soloing_badge',
    'orchestrating_badge'
  )
);
