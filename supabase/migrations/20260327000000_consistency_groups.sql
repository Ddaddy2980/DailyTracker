-- =============================================================================
-- Phase 2.5 — Consistency Groups Migration (Step 16a)
-- Adds three new tables. Does NOT modify any existing tables.
--
-- 1. consistency_groups   — group metadata and invite code
-- 2. group_members        — group membership per user
-- 3. group_daily_status   — lightweight per-member daily check-in status
--                           unique(group_id, user_id, status_date) enables
--                           upsert on re-check-in without creating duplicates
-- =============================================================================


-- ── 1. consistency_groups ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS consistency_groups (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text        NOT NULL CHECK (char_length(name) <= 30),
  created_by         text        NOT NULL,   -- Clerk user_id of creator
  invite_code        text        NOT NULL UNIQUE,
  invite_url_enabled boolean     NOT NULL DEFAULT true,
  max_members        integer     NOT NULL DEFAULT 12,
  created_at         timestamptz NOT NULL DEFAULT now(),
  active             boolean     NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS consistency_groups_created_by_idx
  ON consistency_groups (created_by);

CREATE INDEX IF NOT EXISTS consistency_groups_invite_code_idx
  ON consistency_groups (invite_code);

ALTER TABLE consistency_groups ENABLE ROW LEVEL SECURITY;

-- Any authenticated member (or the creator) can read the group
CREATE POLICY "consistency_groups: members and creator can read"
  ON consistency_groups FOR SELECT
  USING (
    created_by = auth.uid()::text
    OR id IN (
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = auth.uid()::text
        AND gm.active = true
    )
  );

-- Any authenticated user can create a group
CREATE POLICY "consistency_groups: authenticated users can create"
  ON consistency_groups FOR INSERT
  WITH CHECK (created_by = auth.uid()::text);

-- Only the creator can update (rename, toggle invite URL, soft-delete via active = false)
CREATE POLICY "consistency_groups: creator can update"
  ON consistency_groups FOR UPDATE
  USING  (created_by = auth.uid()::text)
  WITH CHECK (created_by = auth.uid()::text);


-- ── 2. group_members ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS group_members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid        NOT NULL REFERENCES consistency_groups (id) ON DELETE CASCADE,
  user_id      text        NOT NULL,   -- Clerk user_id
  display_name text        NOT NULL,   -- snapshot from user_profile at join time
  joined_at    timestamptz NOT NULL DEFAULT now(),
  active       boolean     NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS group_members_group_id_idx
  ON group_members (group_id);

CREATE INDEX IF NOT EXISTS group_members_user_id_idx
  ON group_members (user_id);

-- Composite index for the common lookup: all active groups for a given user
CREATE INDEX IF NOT EXISTS group_members_user_id_active_idx
  ON group_members (user_id, active);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Members of the same group can see each other's membership rows
CREATE POLICY "group_members: members can read group rows"
  ON group_members FOR SELECT
  USING (
    group_id IN (
      SELECT gm2.group_id
      FROM group_members gm2
      WHERE gm2.user_id = auth.uid()::text
        AND gm2.active = true
    )
  );

-- A user can insert their own membership row (joining a group)
CREATE POLICY "group_members: own row insert"
  ON group_members FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- A user can update their own membership row (leaving a group sets active = false)
-- Creator removing another member is handled server-side via service role key
CREATE POLICY "group_members: own row update"
  ON group_members FOR UPDATE
  USING  (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);


-- ── 3. group_daily_status ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS group_daily_status (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          uuid        NOT NULL REFERENCES consistency_groups (id) ON DELETE CASCADE,
  user_id           text        NOT NULL,   -- Clerk user_id
  status_date       date        NOT NULL,
  completion_status text        NOT NULL DEFAULT 'none'
                                CHECK (completion_status IN ('full', 'partial', 'none')),
  streak_count      integer     NOT NULL DEFAULT 0,
  active_pillars    text[]      NOT NULL DEFAULT '{}',
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- This unique constraint is the foundation of the upsert pattern in submitCheckin.
  -- ON CONFLICT (group_id, user_id, status_date) DO UPDATE ... re-check-in updates
  -- the existing row rather than inserting a duplicate.
  CONSTRAINT group_daily_status_unique_day
    UNIQUE (group_id, user_id, status_date)
);

CREATE INDEX IF NOT EXISTS group_daily_status_group_id_date_idx
  ON group_daily_status (group_id, status_date);

CREATE INDEX IF NOT EXISTS group_daily_status_user_id_idx
  ON group_daily_status (user_id);

ALTER TABLE group_daily_status ENABLE ROW LEVEL SECURITY;

-- Any active member of the group can read all status rows for that group
CREATE POLICY "group_daily_status: members can read group rows"
  ON group_daily_status FOR SELECT
  USING (
    group_id IN (
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = auth.uid()::text
        AND gm.active = true
    )
  );

-- Users can only insert their own status rows
CREATE POLICY "group_daily_status: own row insert"
  ON group_daily_status FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- Users can only update their own status rows (re-check-in / upsert)
CREATE POLICY "group_daily_status: own row update"
  ON group_daily_status FOR UPDATE
  USING  (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
