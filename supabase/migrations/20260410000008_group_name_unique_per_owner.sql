-- Migration: Enforce case-insensitive unique group name per owner
-- Phase 9 — group naming rules
--
-- Rule: a single user cannot own two groups with the same name
-- when compared case-insensitively. "Morning Crew" and "morning crew"
-- by the same owner are treated as duplicates.
--
-- Different owners may use the same name freely — global uniqueness
-- would be too restrictive at scale.

CREATE UNIQUE INDEX consistency_groups_owner_name_unique
  ON consistency_groups (user_id, lower(name));
