-- Migration: Add Life Pause columns to challenges table
-- Step 16b — Challenge pause/resume feature
--
-- New columns:
--   is_paused              — true when challenge is currently paused
--   paused_at              — timestamp when the current pause began (null when not paused)
--   pause_reason           — optional free-text reason the user supplied
--   pause_days_used        — running total of calendar days spent on historical pauses
--                            (accumulated at each resume; does NOT include the current active pause)
--   scheduled_pause_date   — future date on which the challenge auto-pauses (null when not scheduled)
--   scheduled_pause_reason — optional reason for the scheduled pause

ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS is_paused             boolean   DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_at             timestamptz,
  ADD COLUMN IF NOT EXISTS pause_reason          text,
  ADD COLUMN IF NOT EXISTS pause_days_used       integer   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scheduled_pause_date  date,
  ADD COLUMN IF NOT EXISTS scheduled_pause_reason text;

-- Ensure pause_days_used is never negative
ALTER TABLE challenges
  ADD CONSTRAINT challenges_pause_days_used_nonneg CHECK (pause_days_used >= 0);
