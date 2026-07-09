-- =============================================================================
-- v4 Phase 1 Migration — Streaks, Grace, Goal Labels/Icons, Atomic Check-in Merge
-- Branch: v4-phase1
-- Date: 2026-07-09
--
-- Part A: duration_goals gains label + icon (nullable — client falls back to
--         a truncated goal_text and a per-pillar default emoji, so no backfill).
-- Part B: daily_summary — one row per user per finalized day, written by the
--         lazy streak evaluator. Snapshots the required-pillar count at the
--         time the day is evaluated (pillar activation dates are not tracked
--         historically; this snapshot is the source of truth for streak walks
--         and future Journey-page stats).
-- Part C: streak_state — one row per user. Cache of the streak walk through
--         *yesterday* only; today is never folded in (display adds +1 live
--         when today is sealed).
-- Part D: checkin_merge_goal() — atomic per-goal jsonb merge + completed
--         recompute, so two concurrent goal commits can never clobber each
--         other's goal_completions writes.
-- =============================================================================


-- =============================================================================
-- PART A: duration_goals — short label + emoji icon (chosen at goal creation)
-- =============================================================================

ALTER TABLE duration_goals
  ADD COLUMN label text,
  ADD COLUMN icon  text;


-- =============================================================================
-- PART B: daily_summary
-- =============================================================================

CREATE TABLE daily_summary (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text NOT NULL,
  summary_date      date NOT NULL,
  -- Active pillars that had >= 1 active duration goal when this day was evaluated
  pillars_required  integer NOT NULL DEFAULT 0,
  pillars_completed integer NOT NULL DEFAULT 0,
  -- true when every required pillar was completed (a "sealed" day)
  main_complete     boolean NOT NULL DEFAULT false,
  -- true when a grace day was consumed to cover this (missed) day
  grace_used        boolean NOT NULL DEFAULT false,
  -- true when the day fell inside a Life Pause — neutral for streaks
  paused            boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, summary_date)
);

CREATE TRIGGER daily_summary_updated_at
  BEFORE UPDATE ON daily_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX daily_summary_user_date_idx ON daily_summary (user_id, summary_date DESC);

ALTER TABLE daily_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily summaries"
  ON daily_summary FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Service role can manage all daily summaries"
  ON daily_summary FOR ALL USING (true);


-- =============================================================================
-- PART C: streak_state
-- =============================================================================

CREATE TABLE streak_state (
  user_id                     text PRIMARY KEY,
  -- Consecutive main-streak days through last_evaluated_date (grace-protected)
  main_streak                 integer NOT NULL DEFAULT 0,
  longest_main_streak         integer NOT NULL DEFAULT 0,
  -- Grace days banked: earn 1 per 7 consecutive main-streak days, cap 2
  grace_bank                  integer NOT NULL DEFAULT 0
                                CHECK (grace_bank >= 0 AND grace_bank <= 2),
  -- The streak value at which grace was last earned — prevents double-earning
  -- when the live check-in earn and the overnight evaluator both fire
  last_grace_earned_at_streak integer NOT NULL DEFAULT 0,
  -- Always <= yesterday (user's local calendar). Today is never folded in.
  last_evaluated_date         date NOT NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER streak_state_updated_at
  BEFORE UPDATE ON streak_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE streak_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own streak state"
  ON streak_state FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Service role can manage all streak state"
  ON streak_state FOR ALL USING (true);


-- =============================================================================
-- PART D: checkin_merge_goal
-- Atomically merges one goal's completion flag into the entry's jsonb map and
-- recomputes `completed` from the user's active duration goals for the pillar.
-- Two racing commits both land: ON CONFLICT + in-row `||` concatenation means
-- the last writer merges INTO the other's result rather than over it.
-- Returns: { goal_completions, completed, was_completed }
-- =============================================================================

CREATE OR REPLACE FUNCTION checkin_merge_goal(
  p_user_id      text,
  p_challenge_id uuid,
  p_pillar       text,
  p_entry_date   date,
  p_goal_id      text,
  p_done         boolean
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_row       pillar_daily_entries%ROWTYPE;
  v_was       boolean;
  v_completed boolean;
BEGIN
  INSERT INTO pillar_daily_entries
    (user_id, challenge_id, pillar, entry_date, completed, goal_completions)
  VALUES
    (p_user_id, p_challenge_id, p_pillar, p_entry_date, false,
     jsonb_build_object(p_goal_id, p_done))
  ON CONFLICT (user_id, pillar, entry_date) DO UPDATE
    SET goal_completions =
      pillar_daily_entries.goal_completions || jsonb_build_object(p_goal_id, p_done)
  RETURNING * INTO v_row;

  v_was := v_row.completed;

  -- completed = the pillar has at least one active duration goal AND every
  -- active duration goal is true in the merged map. Destination-goal keys in
  -- the map are ignored here by construction (only duration_goals are joined).
  SELECT count(*) > 0
     AND bool_and(coalesce((v_row.goal_completions ->> dg.id::text)::boolean, false))
    INTO v_completed
    FROM duration_goals dg
   WHERE dg.user_id   = p_user_id
     AND dg.pillar    = p_pillar
     AND dg.is_active = true;

  v_completed := coalesce(v_completed, false);

  UPDATE pillar_daily_entries
     SET completed = v_completed
   WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'goal_completions', v_row.goal_completions,
    'completed',        v_completed,
    'was_completed',    v_was
  );
END;
$$;
