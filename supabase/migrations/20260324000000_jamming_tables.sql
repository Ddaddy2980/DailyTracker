-- =============================================================================
-- Jamming Level Migration
-- 1. Add pulse_checks table
-- 2. Add notification_tier, last_pulse_check_at, accountability_partner_name,
--    accountability_partner_contact to user_profile
-- 3. Fix rewards constraint: old badge names → new level names
-- =============================================================================


-- ── 1. pulse_checks ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pulse_checks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      text NOT NULL,
  challenge_id uuid REFERENCES challenges (id) ON DELETE CASCADE,
  week_number  integer NOT NULL,
  pulse_state  text NOT NULL,
  trigger_type text NOT NULL,
  recorded_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pulse_checks_state_check
    CHECK (pulse_state IN ('smooth_sailing', 'rough_waters', 'taking_on_water')),
  CONSTRAINT pulse_checks_trigger_check
    CHECK (trigger_type IN ('scheduled_weekly', 'missed_day', 'partial_completion'))
);

CREATE INDEX IF NOT EXISTS pulse_checks_user_id_idx      ON pulse_checks (user_id);
CREATE INDEX IF NOT EXISTS pulse_checks_challenge_id_idx ON pulse_checks (challenge_id);

ALTER TABLE pulse_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulse_checks: own rows only"
  ON pulse_checks FOR ALL
  USING (user_id = auth.uid()::text);


-- ── 2. user_profile new columns ───────────────────────────────────────────────

ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS notification_tier             text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS last_pulse_check_at           timestamptz,
  ADD COLUMN IF NOT EXISTS accountability_partner_name   text,
  ADD COLUMN IF NOT EXISTS accountability_partner_contact text;

ALTER TABLE user_profile
  DROP CONSTRAINT IF EXISTS user_profile_notification_tier_check;

ALTER TABLE user_profile
  ADD CONSTRAINT user_profile_notification_tier_check
    CHECK (notification_tier IN ('minimal', 'standard', 'full'));


-- ── 3. Fix rewards constraint: rename badge types ─────────────────────────────
-- Old names: starter_badge, builder_badge, consistent_badge, refiner_badge, guide_badge
-- New names: tuning_badge,  jamming_badge, grooving_badge,   soloing_badge, orchestrating_badge

-- Update any existing rows first
UPDATE rewards SET reward_type = 'tuning_badge'        WHERE reward_type = 'starter_badge';
UPDATE rewards SET reward_type = 'jamming_badge'       WHERE reward_type = 'builder_badge';
UPDATE rewards SET reward_type = 'grooving_badge'      WHERE reward_type = 'consistent_badge';
UPDATE rewards SET reward_type = 'soloing_badge'       WHERE reward_type = 'refiner_badge';
UPDATE rewards SET reward_type = 'orchestrating_badge' WHERE reward_type = 'guide_badge';

-- Drop old constraint, add new one
ALTER TABLE rewards DROP CONSTRAINT IF EXISTS rewards_type_check;

ALTER TABLE rewards ADD CONSTRAINT rewards_type_check CHECK (
  reward_type IN (
    'tuning_badge',
    'day1_complete',
    'day3_survival',
    'halfway',
    'day7_complete',
    'jamming_badge',
    'grooving_badge',
    'soloing_badge',
    'orchestrating_badge'
  )
);
