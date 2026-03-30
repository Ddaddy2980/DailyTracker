-- =============================================================================
-- Migration: challenge pause fields
-- Date: 2026-03-30
-- Step 27 — Life interruption pause system (Grooving level)
--
-- Adds two boolean columns to the challenges table:
--
--   is_paused   — current pause state; true while challenge is paused,
--                 false at rest and after resume. Toggled by pauseChallenge /
--                 resumeChallenge / autoResumePausedChallenges.
--
--   pause_used  — permanent one-way flag; set to true when pauseChallenge fires
--                 and never cleared. Enforces the one-pause-per-challenge rule.
--                 Survives resume so the option disappears after use.
--
-- The companion challenge_pauses table that stores the pause record
-- (pause_reason, paused_at, resumed_at, days_paused) already exists —
-- it was created in 20260325000000_grooving_tables.sql.
-- =============================================================================

ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS is_paused  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pause_used boolean NOT NULL DEFAULT false;
