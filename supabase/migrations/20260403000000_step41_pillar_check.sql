-- Step 41 — Monthly Pillar Check
-- Adds two nullable columns to weekly_reflections to persist the pillar check
-- question response: which pillar was targeted and the user's free-text answer.
-- Cadence is enforced via last_pillar_check_at on user_profile (already exists).

ALTER TABLE weekly_reflections
  ADD COLUMN IF NOT EXISTS pillar_check_pillar text,
  ADD COLUMN IF NOT EXISTS pillar_check_answer text;
