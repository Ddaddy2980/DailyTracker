-- Step 29 — Grooving notification system
-- Adds last_pattern_alert_at to user_profile for cron de-duplication of
-- the habit calendar pattern alert (prevents repeat alerts within 14 days).

ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS last_pattern_alert_at timestamptz;
