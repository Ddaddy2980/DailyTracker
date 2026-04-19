-- Migration: Internal groups redesign — public/private visibility + invitation system
-- Phase 9, Step 21

-- Add public/private visibility to existing groups (default public)
ALTER TABLE consistency_groups
  ADD COLUMN is_public boolean NOT NULL DEFAULT true;

-- Invitation/request system
CREATE TABLE group_invitations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid        NOT NULL REFERENCES consistency_groups(id) ON DELETE CASCADE,
  type          text        NOT NULL CHECK (type IN ('invitation', 'request')),
  from_user_id  text        NOT NULL,
  to_user_id    text        NOT NULL,
  status        text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

-- Prevent duplicate pending invitations/requests for the same pair in a group
CREATE UNIQUE INDEX group_invitations_pending_unique
  ON group_invitations (group_id, from_user_id, to_user_id)
  WHERE status = 'pending';

-- Index for fast notification lookups (find invitations addressed to a user)
CREATE INDEX idx_group_invitations_to_user ON group_invitations (to_user_id, status, expires_at);

-- Index for fast request lookups by group owner
CREATE INDEX idx_group_invitations_group ON group_invitations (group_id, type, status, expires_at);

-- RLS: users can read rows where they are the sender or recipient
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invitations"
  ON group_invitations
  FOR SELECT
  USING (from_user_id = auth.uid()::text OR to_user_id = auth.uid()::text);
