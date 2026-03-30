-- =============================================================================
-- Replace consistency_groups.active (boolean) with status (text enum)
--
-- Motivation: a boolean active/inactive field cannot represent the four
-- lifecycle states the group management UI needs:
--   active    — the group is running normally
--   paused    — temporarily suspended by the creator
--   archived  — preserved with history; creator can reactivate
--   deleted   — permanent removal; treated as gone
--
-- Steps:
--   1. Add the new status column (default 'active' — safe for existing rows)
--   2. Migrate any rows that were previously set active = false → 'deleted'
--   3. Add archived_at column for recording when a group was archived
--   4. Drop the old active column
--   5. Update the RLS SELECT policy (referenced active; now references status)
-- =============================================================================


-- ── 1. Add status column ──────────────────────────────────────────────────────

ALTER TABLE consistency_groups
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CONSTRAINT consistency_groups_status_check
      CHECK (status IN ('active', 'paused', 'archived', 'deleted'));

-- ── 2. Migrate existing inactive rows ────────────────────────────────────────
-- Any group that was soft-deleted via active = false becomes 'deleted'.

UPDATE consistency_groups
   SET status = 'deleted'
 WHERE active = false;

-- ── 3. Add archived_at timestamp ─────────────────────────────────────────────

ALTER TABLE consistency_groups
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- ── 4. Drop the old boolean column ───────────────────────────────────────────

ALTER TABLE consistency_groups
  DROP COLUMN IF EXISTS active;

-- ── 5. Replace the RLS SELECT policy ─────────────────────────────────────────
-- The old policy tested group_members.active (boolean, unchanged) but the
-- groups side now uses status.  We add no group-status filter here because:
--   a) All server actions use the service role key (bypasses RLS anyway).
--   b) Creators should be able to read their own archived/deleted groups.
-- The app-level getMyGroups / getGroupWithMembers already filter by status.

DROP POLICY IF EXISTS "consistency_groups: members and creator can read"
  ON consistency_groups;

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
