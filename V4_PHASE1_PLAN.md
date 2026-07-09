# v4 Phase 1 — Streaks, Grace, Dashboard Redesign, Press-and-Hold Check-in, Tempo Debut

> **BUILD STATUS (updated 2026-07-09, end of first build session)** — branch `v4-phase1`:
>
> - [x] Step 1 — Migration + types + constants — commit `2a67013`
> - [x] Step 2 — Streak engine + evaluator wiring — commit `5bb98fb`
> - [~] Step 3 — PARTIAL: /api/checkin per-goal path shipped (`ae1fd7d`, legacy body still accepted); **`hooks/useGoalCommit.ts` not yet written — first task next session**
> - [ ] Step 4 — Tempo (lib/tempo.ts, TempoCharacter, TempoBubble)
> - [ ] Step 5 — Dashboard components (HeroCard, HeroRing, DayStrip, V4PillarCard, GoalRing, WhisperRow, globals.css)
> - [ ] Step 6 — DashboardShell rewrite + delete 8 old components + usePillarSave + legacy checkin branch
> - [ ] Step 7 — Goal editor label/icon + ARCHITECTURE.md docs
>
> ⚠️ **Migration `20260410000009_v4_streaks_and_goal_labels.sql` has NOT been run in Supabase yet** — David runs it before any smoke test (dashboard now calls the streak evaluator on load; errors are non-fatal but nothing streak-related works until it's run).
>
> Open decision for David: bootstrap seeds the main streak from entry history (feels earned on launch day). Change `bootstrapStreakState` in `lib/streaks.ts` if starting at 0 is preferred.
>
> Session protocol: at session start read this file end to end, work the first unchecked step, mark it here + log in CLAUDE.local.md, `npx tsc --noEmit` and commit per step.

## Context

v3 tracks consistency but isn't habit-forming ("necessary bland chore"). The v4 Engagement Overhaul (PRODUCT.md §v4, design locked 2026-07-09; visual target `design/v4-dashboard-mockup.html`) rebuilds the engagement loop. **Phase 1** (this build, branch `v4-phase1`): per-pillar + main streaks with grace days, the hero-ring dashboard redesign, press-and-hold per-goal check-in replacing Save buttons, radiant done-states + perfect-day seal, and Tempo's celebration-line debut.

**Scope decisions confirmed with David:**
- Onboarding redesign follows immediately as a separate build (not in this one).
- Destination goals (Grooving/Soloing): compact tap-to-toggle checklist below the goal rings — quieter than rings, same storage as today, never affects `completed`/streaks.
- Video buttons + VideoModal removed from pillar cards now (`/videos` page + onboarding gate stay until Phase 4).
- Streaks are user-level and cross-challenge; gaps between challenges break streaks naturally (missed days). Life Pause freezes the main streak.

## Core design

### Streak model
- **`streak_state`** (1 row/user, new table): `main_streak`, `longest_main_streak`, `grace_bank` (0–2), `last_grace_earned_at_streak` (double-earn guard), `last_evaluated_date`. **Invariant: covers through *yesterday* only.** Displayed streak = `main_streak + (today sealed ? 1 : 0)`.
- **`daily_summary`** (1 row/user/day, new table): `pillars_required`, `pillars_completed`, `main_complete`, `grace_used`, `paused`, UNIQUE(user_id, summary_date). Written by the lazy evaluator; snapshots the then-current required-pillar set (pillar activation dates aren't tracked historically — this solves that). Also feeds the Phase-3 Journey stats.
- **Grace:** earn 1 per 7 consecutive main-streak days, bank cap 2; a missed day consumes 1 overnight (streak holds, doesn't increment); no grace → streak resets to 0. Grace protects the main streak only; pillar streaks are honest.
- **Evaluation is lazy, no cron** (same pattern as scheduled-pause auto-activation): `evaluatePendingDays` runs on dashboard load, at the top of `/api/checkin`, and inside `/api/challenges/resume` *before* flipping `is_paused` (so days inside the pause window classify as paused — no pause-ledger table needed; the evaluator also treats `scheduled_pause_date <= D` as paused).
- **Retroactive rules:** save with `entry_date === yesterday` → `reevaluateYesterday` recomputes yesterday's summary, refunds grace if it was consumed (`grace_used` flag on the row makes refund safe), and recomputes `main_streak` by walking `daily_summary` backwards — resurrects a streak broken *only* by yesterday. Older dates update `daily_summary` history only, never `streak_state`.
- **Per-pillar streaks:** computed, not stored — walk `pillar_daily_entries` per pillar desc (limit 400, cross-challenge), skipping `daily_summary.paused` dates.
- **First-ever load bootstrap:** seed `main_streak` by walking existing entries against the current pillar set, `grace_bank = min(2, streak/7)`, `last_evaluated_date = yesterday`. (Launch day feels earned, not zeroed.)
- Zero-goal pillars aren't "required"; a user with no goal-bearing active pillars gets neutral days (never phantom misses).
- Concurrency: `streak_state` update guarded by `WHERE last_evaluated_date = <value read>`; loser re-reads. Per-goal jsonb merge is atomic in a Postgres function.

### Check-in contract (per-goal commits)
Same route `/api/checkin` (only consumer is `usePillarSave` — verified). New body:
`{ pillar, challengeId, goalId, goalType: 'duration'|'destination', done, entry_date? }`
New Postgres function **`checkin_merge_goal`** does `INSERT … ON CONFLICT DO UPDATE SET goal_completions = goal_completions || jsonb_build_object(goalId, done)` and recomputes `completed` from active duration goals in one atomic call (returns `was_completed` too). Destination goals keep their existing **raw UUID keys** in `goal_completions` (verified: current cards call `toggleGoal(goal.id)` — `dest-` is only an HTML id).

Response (extends `CheckinApiResponse`): `{ success, completed, advanced, newLevel, pillarCompleted (false→true this commit), pillarStreak, daySealed, mainStreak, graceBank, graceEarned }` — everything the UI needs to animate without refetching. Guards unchanged (ownership-in-same-query, pause 403, today-past-duration 403); goal ownership verified against the right table. Today-saves keep `await syncGroupDailyStatus` + `await updatePulseState` + the existing rolling-window advancement block (fires on `pillarCompleted`). When a seal makes the display streak hit a multiple of 7, `applyLiveGraceEarn` banks it immediately (idempotent vs. tomorrow's evaluator via the guard field).

### UI (mockup-faithful)
- **HeroCard + HeroRing**: 96px SVG ring, one arc segment per required pillar (share ∝ goal count, fill ∝ goals done, `PILLAR_CONFIG[p].title` strokes, 6px gaps, mockup math verbatim), % center, greeting, streak line (🎵 N day main streak · X grace banked), sealed-chip swap, Tempo perched + self-dismissing bubble. Sticky. Paused variant (replaces DashboardHeader in the paused branch, streak frozen note).
- **DayStrip**: "Day X of Y · Today ▾" → expands to ‹ › nav (logic lifted from DashboardHeader) + History link.
- **V4PillarCard** (one component, all 4 levels): header = pillar PNG icon / name / level / 7-day dots / 🔥 pillar streak; body = GoalRing grid; Grooving+ destination checklist below divider; `lit` glow + `shimmer` sweep states; empty state "Add a goal → /goals" when no active goals.
- **GoalRing**: 64px press-and-hold — pointerdown starts 450ms CSS fill + timeout, up/leave/cancel snaps back, Enter/Space instant (a11y), `touch-action:none` on target, haptic on commit, optimistic with rollback, commit-only (no un-check), disabled in-flight. Label = `goal.label ?? deriveGoalLabel(goal_text)`, icon = `goal.icon ?? DEFAULT_GOAL_EMOJI[pillar]` (emoji by design — mockup; per-goal icons have no PNG set).
- **WhisperRow** for dormant pillars → `/goals`.
- **Perfect-day sequence** (shell-orchestrated on `daySealed`): hero snap → 220ms-staggered shimmer cascade → sealed chip → gold gradient screen state → Tempo line.
- **Atmosphere**: dashboard wrapper gradient classes (dawn/day/evening by client hour + sealed gold) replacing flat `#EBEBEC`; `prefers-reduced-motion` kills shimmer/pendulum/cascade (hold gesture stays, fill becomes opacity step).
- **Tempo (Phase-1 slice)**: `lib/tempo.ts` — ~40–60 curated lines: greetings (time/state), pillar-complete ×4 level registers (hype→honest→wry→quiet-proud), perfect-day, grace-morning ("Grace covered yesterday — your streak holds."), comeback-morning. Session-scoped no-repeat + unprompted cap of 2 via sessionStorage (30-day no-repeat window deferred to Phase 4). No Scripture in lines (faith boundary). Morning line priority: comeback > grace > greeting.
- **Kept & rewired**: AdvancementCelebrationModal (via new hook's `advancedToLevel`/`dismissAdvancement`), PausedDashboard, LifePauseBanner, CompletionCountdownBanner, EndOfChallengeDecision, History → `/dashboard?date=` past-day editing (rings work on past days; engine handles yesterday-vs-older server-side; hero hides streak line on past days).
- **Deleted at cleanup**: Tuning/Jamming/Grooving/Soloing/PillarCard, DormantPillarCard, DashboardHeader, ProgressRing (consumers verified: only Grooving/Soloing), `hooks/usePillarSave.ts`.

### Goal editor (label + icon)
`GoalInputRow` gains emoji picker (`PILLAR_GOAL_EMOJI[pillar]`, ~12/pillar in constants) + short label input (auto from `deriveGoalLabel`, max 16); threads through both `GoalEditorCard` modes, `OnboardingGoalsClient` batch payload, `POST /api/goals/duration`, `POST /api/onboarding/goals`. `DURATION_GOAL_SUGGESTIONS` restructured to `{text, label, icon}[]` (only consumer: GoalSuggestions). Columns nullable — existing goals fall back, no backfill.

## Build sequence (each step committable; `npx tsc --noEmit` after each)

| # | Step | Key files | SQL? |
|---|------|-----------|------|
| 1 | Migration + types + constants | NEW `supabase/migrations/20260410000009_v4_streaks_and_goal_labels.sql` (goal label/icon cols; `daily_summary`; `streak_state`; `checkin_merge_goal` fn; v3-style RLS/triggers); `lib/types.ts` (DurationGoal +label/icon, DailySummary, StreakState, new API types); `lib/constants.ts` (PILLAR_GOAL_EMOJI, deriveGoalLabel, GRACE_* consts, suggestions restructure) + `GoalSuggestions.tsx` compile fix | **David runs SQL in Supabase** |
| 2 | Streak engine + evaluator wiring | NEW `lib/streaks.ts` (classifyDay, applyDay, computeMainStreakFromSummaries, evaluatePendingDays, reevaluateYesterday, computePillarStreaks, applyLiveGraceEarn); `app/(app)/dashboard/page.tsx` (call evaluator, pass streak props — optional on old shell temporarily); `app/api/challenges/resume/route.ts` (evaluate before flip) | no |
| 3 | Checkin rewrite + hook | `app/api/checkin/route.ts` (new body + RPC + streak fields; temporary legacy-body branch keeps old cards working); NEW `hooks/useGoalCommit.ts` (promise-queued commits, inFlight set, advancement wiring) | no |
| 4 | Tempo | NEW `lib/tempo.ts`, `components/dashboard/TempoCharacter.tsx` (mockup SVG), `TempoBubble.tsx` | no |
| 5 | Dashboard components | NEW `HeroCard.tsx`, `HeroRing.tsx`, `DayStrip.tsx`, `V4PillarCard.tsx`, `GoalRing.tsx`, `WhisperRow.tsx`; `app/globals.css` (sweep keyframes, lit glow, atmosphere gradients, reduced-motion) | no |
| 6 | Integration + cleanup | Rewrite `DashboardShell.tsx` (optimistic completions state, seal cascade, Tempo orchestration, paused branch → HeroCard variant); finalize `dashboard/page.tsx`; DELETE 8 old components + `usePillarSave.ts` + checkin legacy branch + dead types | no |
| 7 | Goal editor + docs | `GoalInputRow/GoalEditorCard/GoalList/OnboardingGoalsClient` + both goals API routes; update ARCHITECTURE.md (v4 Phase 1 section) + CLAUDE.local.md status log | no |

## Verification
- After Step 1: David runs migration; confirm tables + function in Supabase dashboard.
- After Step 2: load dashboard → `streak_state` bootstrap row + `daily_summary` rows appear; reload idempotent.
- After Step 3: old dashboard still saves (legacy branch); direct POST of new shape merges one key atomically.
- After Step 6 (main smoke, dev server): hold-to-commit fills + saves instantly; releasing early cancels; pillar completion ignites card (lit + shimmer + Tempo line + dots/streak update); completing all pillars runs seal cascade + gold gradient + streak odometer + sealed chip; past-day cell from History opens editable rings; yesterday backfill restores streak / refunds grace (check `streak_state` in Supabase); older backfill doesn't; paused view frozen; dormant whisper row; advancement → celebration modal; reduced-motion sane; `npx tsc --noEmit` clean.
- After Step 7: create goal with icon/label mid-challenge and in onboarding; legacy goals render with fallbacks.

## Risks / edge cases (answers baked in)
Timezone yesterday-boundary (client sends explicit `entry_date`; server uses `todayInTz(tz)`); jsonb race (atomic `||` merge in Postgres fn + client queue); concurrent evaluators (optimistic guard); grace refund never exceeds cap (`grace_used` implies bank was ≥1); live-earn vs evaluator double-earn (guard field); pauses without ledger (evaluate-inside-resume + scheduled-date awareness; ranges persist in `daily_summary.paused`); goal added after pillar sealed can un-seal at next commit (existing v3 behavior, unchanged); challenge gaps break streaks (intended); bootstrap seeds streak from history (flag: David may prefer starting at 0 — default is seed).
