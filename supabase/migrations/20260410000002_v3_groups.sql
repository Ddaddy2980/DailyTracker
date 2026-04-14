-- =============================================================================
-- v3 Groups Migration
-- Daily Consistency Tracker — Phase 5: Groups
-- Branch: v3-phase1
-- Date: 2026-04-14
--
-- Creates three new tables for the Groups feature:
--   consistency_groups    — A group, owned by its creator.
--   group_members         — One row per user per group (soft-delete via is_active).
--   group_daily_status    — One row per user per group per date. Synced from /api/checkin.
--
-- invite_code is generated app-side and passed in at group creation.
-- All writes go through service role API routes — RLS restricts anon reads to own rows.
-- =============================================================================


-- =============================================================================
-- TABLE: consistency_groups
-- =============================================================================

CREATE TABLE consistency_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,
  name        text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  max_members integer NOT NULL DEFAULT 10,
  status      text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'paused', 'archived')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX consistency_groups_user_id_idx ON consistency_groups (user_id);

ALTER TABLE consistency_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own groups"
  ON consistency_groups FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role can manage all groups"
  ON consistency_groups FOR ALL
  USING (true);


-- =============================================================================
-- TABLE: group_members
-- One row per user per group. Soft-delete via is_active = false.
-- UNIQUE (group_id, user_id) prevents duplicate membership.
-- =============================================================================

CREATE TABLE group_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid NOT NULL REFERENCES consistency_groups (id) ON DELETE CASCADE,
  user_id      text NOT NULL,
  display_name text NOT NULL,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  is_active    boolean NOT NULL DEFAULT true,

  UNIQUE (group_id, user_id)
);

-- For fetching active members of a group (GroupCard, GroupManageSheet)
CREATE INDEX group_members_group_id_idx ON group_members (group_id, is_active);

-- For fetching groups a user belongs to (groups page list)
CREATE INDEX group_members_user_id_idx ON group_members (user_id, is_active);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own memberships"
  ON group_members FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role can manage all group members"
  ON group_members FOR ALL
  USING (true);


-- =============================================================================
-- TABLE: group_daily_status
-- One row per user per group per date.
-- Upserted from /api/checkin whenever a pillar save completes for today.
-- completed mirrors the overall daily completed boolean from pillar_daily_entries.
-- =============================================================================

CREATE TABLE group_daily_status (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES consistency_groups (id) ON DELETE CASCADE,
  user_id     text NOT NULL,
  status_date date NOT NULL,
  completed   boolean NOT NULL DEFAULT false,

  UNIQUE (group_id, user_id, status_date)
);

-- For loading today's check-in dots for all members of a group
CREATE INDEX group_daily_status_group_date_idx ON group_daily_status (group_id, status_date);

ALTER TABLE group_daily_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own group daily status"
  ON group_daily_status FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Service role can manage all group daily status"
  ON group_daily_status FOR ALL
  USING (true);
