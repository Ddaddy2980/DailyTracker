-- Migration: pulse_state on challenges
-- Stores the computed challenge health signal so the notification cron
-- can read it without re-loading full pillar_daily_entries history.
-- Computed and written on every /api/checkin save (today's saves only).

ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS pulse_state      text        DEFAULT 'smooth_sailing',
  ADD COLUMN IF NOT EXISTS pulse_updated_at timestamptz;

-- Constrain to valid values
ALTER TABLE challenges
  ADD CONSTRAINT challenges_pulse_state_check
  CHECK (pulse_state IN ('smooth_sailing', 'rough_waters', 'taking_on_water'));
