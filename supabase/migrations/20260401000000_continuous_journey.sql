-- =============================================================================
-- Migration: 20260401000000_continuous_journey.sql
-- Purpose:   Add continuous journey architecture columns to challenges and
--            user_profile. All columns use ADD COLUMN IF NOT EXISTS so this
--            migration is safe to re-run.
--
-- Grandfather clause: existing rows keep is_continuous = false (the default)
-- and are never touched by the new journey engine.
--
-- Execution: Run manually in the Supabase SQL Editor dashboard.
-- =============================================================================

-- ── challenges table ──────────────────────────────────────────────────────────

ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS is_continuous              boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS journey_current_level      integer  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS journey_level_history      jsonb    NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tuning_days_completed      integer  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tuning_evaluation_done     boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS jamming_phase1_completed   boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS jamming_phase2_unlocked    boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS jamming_phase2_accepted    boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_journey_event      jsonb;

-- ── user_profile table ────────────────────────────────────────────────────────

ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS journey_start_date         date,
  ADD COLUMN IF NOT EXISTS journey_total_days         integer,
  ADD COLUMN IF NOT EXISTS journey_level_preview      jsonb    NOT NULL DEFAULT '[]'::jsonb;

-- ── Indexes ───────────────────────────────────────────────────────────────────
-- Fast lookup of continuous-journey challenges by user

CREATE INDEX IF NOT EXISTS idx_challenges_continuous
  ON challenges (user_id, is_continuous)
  WHERE is_continuous = true;
