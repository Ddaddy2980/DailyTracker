-- =============================================================================
-- Add JSONB notification fields to support Step 16g group notifications.
--
-- user_profile.pending_join_notification
--   Ephemeral flag written by joinGroup when a new member joins.
--   Format: { memberName: string, groupName: string, seenAt: string | null }
--   Read by GroupCard to render a dismissible "X just joined" banner for the creator.
--   Cleared (seenAt set to now) when the creator dismisses the banner.
--
-- consistency_groups.group_daily_flags
--   Written by updateGroupDailyStatus when all active members hit 'full' for the day.
--   Format: { date: string, notified: boolean }
--   Read by GroupCard to render a celebratory full-group-day banner.
--   notified flips to true after the banner renders once; date provides the 24-hour expiry.
-- =============================================================================

ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS pending_join_notification jsonb;

ALTER TABLE consistency_groups
  ADD COLUMN IF NOT EXISTS group_daily_flags jsonb;
