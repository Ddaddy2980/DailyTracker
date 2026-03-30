-- Add carried_forward_pillars to challenges
-- Stores which pillar keys had goals pre-populated from a previous challenge.
-- Set during completeGroovingOnboarding(); read by checkRootedMilestone()
-- to avoid fragile text comparison when determining goal lineage.

ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS carried_forward_pillars text[] NOT NULL DEFAULT '{}';
