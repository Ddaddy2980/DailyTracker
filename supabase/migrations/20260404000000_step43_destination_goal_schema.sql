-- Step 43 — Destination Goal Schema Correction
-- Rename direction_name → goal_name, drop duration_goal_ref
-- Per PRODUCT.md migration note: these changes bring the table in line with the
-- Phase 5 canonical schema before any destination goal UI is built.

ALTER TABLE duration_goal_destinations
  RENAME COLUMN direction_name TO goal_name;

ALTER TABLE duration_goal_destinations
  DROP COLUMN IF EXISTS duration_goal_ref;
