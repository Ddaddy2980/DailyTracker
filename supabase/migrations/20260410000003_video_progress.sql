-- Migration: video_progress
-- Tracks per-video watch state for each user.
-- Used in: onboarding clarity screen (Step 15) and per-level coaching videos (Step 16).

create table if not exists video_progress (
  id         uuid        default gen_random_uuid() primary key,
  user_id    text        not null,
  video_id   text        not null,
  watched_at timestamptz default now() not null,

  unique (user_id, video_id)
);

alter table video_progress enable row level security;

-- Anon key: users can only read their own rows
create policy "Users can view own video progress"
  on video_progress
  for select
  using (auth.uid()::text = user_id);

-- Writes go through API routes using the service role key, which bypasses RLS.
-- No insert/update/delete policy needed for anon key.
