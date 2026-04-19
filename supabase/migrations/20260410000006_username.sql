-- Migration: Add username system to user_profile
-- Phase 9, Step 20

ALTER TABLE user_profile
  ADD COLUMN username text UNIQUE,
  ADD COLUMN username_set boolean NOT NULL DEFAULT false;

-- Enforce lowercase usernames
ALTER TABLE user_profile
  ADD CONSTRAINT username_lowercase CHECK (username = lower(username));

-- Index for fast availability lookups (case-insensitive via lowercase constraint)
CREATE INDEX idx_user_profile_username ON user_profile (username);
