# ARCHITECTURE.md — System Architecture & Build History

This file contains architecture decisions and the full build sequence log.
Reference it when working on routing, video, notifications, or reviewing 
completed phases. Do not modify completed phase entries.

---

> **v3 is live on `main`, deployed to `altared-tracker.com`.** All v2 phases and the
> `v3-phase1` branch are retired. Do not use them as a base for new work.
> The v3 schema is defined in `supabase/migrations/20260410000000_v3_clean_schema.sql`.

---

> **v4 Phase 1 is COMPLETE and shipped to branch `v4-phase1`** (2026-07-09 → 2026-07-10) — streaks +
> grace days + dashboard redesign + press-and-hold per-goal check-in + Tempo debut.
> Design spec: PRODUCT.md §v4. Build plan + status checklist: `V4_PHASE1_PLAN.md` (repo root).
> All 7 steps committed (Step 6 `518f1a2`, Step 7 `6581b7b`) and **pushed to `origin/v4-phase1`**.
> Migration `20260410000009` RUN in Supabase 2026-07-10. Core loop smoke-verified on device
> (hold-to-commit, ignite, seal cascade, hero ring). **`main`/production stay on v3 — NOT merged/deployed**
> (deploy decision: push-branch, hold-main; alpha testers use the Vercel preview URL; full rollout is a
> later call). Full architecture documented in the **"v4 Phase 1"** section below.

---

## v4 Phase 1 — Streaks, Grace, Dashboard Redesign, Press-and-Hold Check-in, Tempo

Branch `v4-phase1`. Rebuilds the engagement loop on top of the v3 data model (no v3 tables
changed). Design spec: PRODUCT.md §v4; visual target `design/v4-dashboard-mockup.html`.

### Migration `20260410000009_v4_streaks_and_goal_labels.sql` (run 2026-07-10)

- **`duration_goals`** gains nullable `label text` + `icon text` (chosen at goal creation).
  Nullable by design — pre-v4 rows fall back to `deriveGoalLabel(goal_text)` +
  `DEFAULT_GOAL_EMOJI[pillar]` at render time. No backfill.
- **`daily_summary`** (1 row/user/day): `pillars_required`, `pillars_completed`, `main_complete`,
  `grace_used`, `paused`, `UNIQUE(user_id, summary_date)`. Written by the lazy evaluator; snapshots
  the required-pillar set at evaluation time (pillar activation dates aren't tracked historically —
  this snapshot is the source of truth for streak walks + future Journey stats).
- **`streak_state`** (1 row/user): `main_streak`, `longest_main_streak`, `grace_bank` (0–2, CHECK),
  `last_grace_earned_at_streak` (double-earn guard), `last_evaluated_date` (always ≤ yesterday).
  **Invariant: covers through *yesterday* only.** Displayed streak = `main_streak + (today sealed ? 1 : 0)`.
- **`checkin_merge_goal(user_id, challenge_id, pillar, entry_date, goal_id, done)`** — Postgres fn:
  atomic `INSERT … ON CONFLICT DO UPDATE SET goal_completions = goal_completions || jsonb_build_object(goal_id, done)`,
  then recomputes `completed` from the pillar's active duration goals. Returns
  `{ goal_completions, completed, was_completed }`. Two racing commits both land (in-row `||` merge).
- v3-style RLS on both tables (own-rows SELECT via anon key; service role ALL).

### Streak model (`lib/streaks.ts`)

- **Grace:** earn 1 per 7 consecutive main-streak days, bank cap 2. A missed day consumes 1 grace
  overnight (streak holds, doesn't increment); no grace → streak resets to 0. Grace protects the
  main streak only — per-pillar streaks are honest.
- **Lazy evaluation, no cron** (same pattern as scheduled-pause auto-activation): `evaluatePendingDays`
  runs on dashboard load, at the top of `/api/checkin`, and inside `/api/challenges/resume` *before*
  flipping `is_paused` (so days inside the pause window classify as paused — no pause-ledger table;
  the evaluator also treats `scheduled_pause_date <= D` as paused). Fast path is one SELECT.
- **Retroactive:** a save with `entry_date === yesterday` → `reevaluateYesterday` recomputes yesterday's
  summary, refunds grace if it was consumed (`grace_used` flag makes the refund safe), and walks
  `daily_summary` backwards to resurrect a streak broken *only* by yesterday. Older dates update
  `daily_summary` history only (`updateHistoricalSummary`) — never `streak_state`.
- **Per-pillar streaks:** computed, not stored (`computePillarStreaks`) — walk `pillar_daily_entries`
  per pillar desc (cross-challenge), skipping `daily_summary.paused` dates.
- **Bootstrap** (`bootstrapStreakState`): first-ever load seeds `main_streak` from existing entry
  history against the current pillar set, `grace_bank = min(2, streak/7)`, `last_evaluated_date =
  yesterday`. (Launch day feels earned, not zeroed. **Open flag:** flip to start-at-0 if David prefers.)
- Concurrency: `streak_state` update guarded by `WHERE last_evaluated_date = <value read>`; loser re-reads.
- `applyLiveGraceEarn`: when a seal makes the display streak hit a multiple of 7, banks a grace day
  immediately, idempotent vs. tomorrow's evaluator via `last_grace_earned_at_streak`.

### Check-in contract — per-goal commits (`/api/checkin`)

Body: `{ pillar, challengeId, goalId, goalType: 'duration'|'destination', done, entry_date? }`.
Guards unchanged (ownership-in-same-query, pause 403, today-past-duration 403); goal ownership verified
against the right table. Path split by `entry_date`:
- **older than yesterday** → `updateHistoricalSummary` only; never touches `streak_state`.
- **yesterday** → `reevaluateYesterday`; no advancement / pulse / groups.
- **today** → full side-effects: `checkin_merge_goal`, `syncGroupDailyStatus`, `updatePulseState`,
  rolling-window advancement (on `pillarCompleted`), seal check, `applyLiveGraceEarn`.

Response (`GoalCommitApiResponse`): `{ success, completed, advanced, newLevel, pillarCompleted,
pillarStreak, daySealed, mainStreak, graceBank, graceEarned }` — everything the UI needs to animate
without refetching. The legacy whole-map body + `CheckinApiResponse` were removed in Step 6.

### Client commit engine (`hooks/useGoalCommit.ts`)

`useGoalCommit(challengeId, entryDate)` → `{ commit, inFlight, advancedToLevel, dismissAdvancement }`.
- **FIFO promise queue** serializes one user's rapid taps so the server's `streak_state`
  read-modify-write stays off the optimistic-concurrency retry path.
- **`inFlight: Set<goalId>`** so a `GoalRing` disables itself mid-commit.
- **`advancedToLevel`** set from a level-up response; `dismissAdvancement` clears it and `router.refresh()`s
  (refresh deferred to dismiss so `AdvancementCelebrationModal` stays mounted through its animation).
- Never throws — returns `{ ok: true; data } | { ok: false; error }`. Optimistic state / seal cascade /
  Tempo orchestration live in the caller (DashboardShell), not the hook.

### Dashboard UI

- **DashboardShell** (client, rewritten in Step 6) — the orchestrator. One `useGoalCommit`; a flat
  optimistic `completions: Record<goalId, boolean>` seeded once on mount from the viewing-day entry's
  `goal_completions` (duration + destination keys). The page passes **`key={viewingDate}`** so the shell
  *remounts and re-seeds* on day navigation. The seed also derives initial `sealed`, `mainStreak`
  (`+1` when today is already sealed on load), `graceBank`, and per-pillar streaks. `handleCommit`
  does optimistic set → `commit` → rollback + error on failure; on success reconciles streak/grace from
  server truth and (today only, on `pillarCompleted`) runs the **seal cascade** (`600 + i*220ms` shimmer
  stagger, then `atmosphere-sealed` gold + perfect-day Tempo at 1200ms — mockup timing verbatim) or a
  single-pillar shimmer + `selectPillarCompleteLine(level)`. Atmosphere gradient by client hour is set
  in a `useEffect` (avoids a UTC/local hydration mismatch). Past-day view hides the streak line and
  suppresses celebrations; paused view renders `PausedDashboard` only.
- **HeroCard + HeroRing** — 96px segmented ring, one arc per required pillar (share ∝ goal count, fill ∝
  goals done, `PILLAR_CONFIG[p].title` stroke, 6px gaps, mockup math verbatim), % center, greeting,
  streak line (🎵 N · X grace banked), sealed-chip swap, Tempo perched + self-dismissing bubble. Sticky.
- **DayStrip** — "Day X of Y · Today ▾" collapses to ‹ › URL day-nav + History link.
- **V4PillarCard** (one component, all 4 levels) — PNG-icon header / name / level / 7-day dots / 🔥 pillar
  streak; `GoalRing` grid; Grooving+ destination checklist below a divider (tap-toggle, inert to streaks);
  `lit` glow + `shimmer` sweep states; empty-state "Add a goal →". Goal label = `goal.label ??
  deriveGoalLabel`, icon = `goal.icon ?? DEFAULT_GOAL_EMOJI[pillar]`.
- **GoalRing** — 64px press-and-hold: pointerdown → 450ms CSS fill + timeout → commit; up/leave/cancel
  snaps back; Enter/Space instant (a11y); `touch-action:none`; haptic; commit-only (no un-check);
  disabled in-flight. Gesture + presentation only — parent owns optimistic `done` + rollback.
- **WhisperRow** — dormant-pillar invitation row → `/goals`.
- **Kept & rewired:** `AdvancementCelebrationModal`, `PausedDashboard`, `LifePauseBanner`,
  `CompletionCountdownBanner`, `EndOfChallengeDecision`.
- **Deleted at Step-6 cleanup:** `Tuning/Jamming/Grooving/Soloing/PillarCard`, `DormantPillarCard`,
  `DashboardHeader`, `ProgressRing`, `hooks/usePillarSave.ts`.
- **globals.css (Step 5):** `.goal-fill`/`.is-filling`/`.is-done`, `.v4card` `.is-lit`/`.is-shimmer`,
  `.hero-seg`, `.tempo-pendulum`, `.atmosphere-{dawn,day,evening,sealed}`, `prefers-reduced-motion` block.

### Tempo (`lib/tempo.ts`)

Curated line library (no LLM in Phase 1). Greetings (time-of-day / grace / comeback), pillar-complete
×4 level registers (hype → honest → wry → quiet-proud), perfect-day. `selectGreeting` is unprompted,
capped at 2/session, priority comeback > grace > time-of-day, `{name}` interpolation, returns null when
capped. `selectPillarCompleteLine(level)` / `selectPerfectDayLine()` are prompted (never capped).
Session no-repeat per pool via sessionStorage (SSR-safe). No Scripture (faith boundary). `TempoCharacter`
(metronome SVG) + `TempoBubble` (self-dismissing, 4200ms). 30-day cross-session no-repeat + Ask-Tempo
sheet deferred to Phase 4.

### Goal editor — label + icon (Step 7)

`GoalInputRow` gains an emoji picker (`PILLAR_GOAL_EMOJI[pillar]`, ~12/pillar) + a short label input
(auto-mirrors `deriveGoalLabel(text)` until edited, max `GOAL_LABEL_MAX` = 16) and emits a `GoalDraft`
`{ text, label, icon }`. Threads through both `GoalEditorCard` modes, `GoalList` (renders the icon),
`GoalSuggestions` (`onSelect` passes the full `{text,label,icon}` suggestion), `OnboardingGoalsClient`
(pillar state is now `GoalDraft[]`; batch payload carries label/icon), `POST /api/goals/duration`, and
`POST /api/onboarding/goals`. Columns nullable — legacy goals render with fallbacks, no backfill.
`DURATION_GOAL_SUGGESTIONS` is `{text,label,icon}[]` (restructured in Step 1).

### Architectural rules established by v4 Phase 1

- **`streak_state` covers through yesterday only; today's seal is a live +1.** Never fold today into the
  stored streak. The dashboard seeds "today already sealed" from the viewing-day completions on load.
- **Streak evaluation is lazy + idempotent, guarded by `last_evaluated_date`.** No cron. Runs on dashboard
  load, at the top of `/api/checkin`, and inside `/api/challenges/resume` before the pause flip.
- **Per-goal commits merge atomically in Postgres (`checkin_merge_goal`) + are queued client-side.** Never
  read-modify-write a jsonb map from application code for concurrent goals.
- **DashboardShell remounts on day nav via `key={viewingDate}`** to re-seed all optimistic client state.
- **`router.refresh()` is deferred while a modal is mounted** (advancement) — the hook exposes
  `dismissAdvancement`; the modal's Continue wires to it. (Reinforces the 2026-05 rule.)
- **Retroactive saves: yesterday can resurrect/refund; older dates are history-only.** The split lives in
  `/api/checkin` on `entry_date` vs. `yesterday`.
- **Goal `label`/`icon` are nullable and always have render-time fallbacks** (`deriveGoalLabel`,
  `DEFAULT_GOAL_EMOJI`). No migration ever backfills them.

---

## v3 Routing Logic

Every authenticated user session resolves to one of two places:

```
User logs in
  → Check user_profile for this user_id
  → If no row: create one → redirect to /onboarding
  → If onboarding_completed = false: redirect to /onboarding (resumes at correct step)
  → If onboarding_completed = true: redirect to /dashboard
```

One dashboard for all users at all levels. Level logic lives inside per-pillar cards.

## v3 Onboarding Steps (gates in user_profile)

```
0. username_set                  → /onboarding/username  (NEW — first step, Phase 9)
1. challenge_duration_selected   → /onboarding/duration
2. clarity_videos_seen           → /onboarding/videos
3. consistency_profile_completed → /onboarding/profile
4. goals_setup_completed         → /onboarding/goals
5. onboarding_completed          → /dashboard
```

## v3 Rolling Window Advancement Thresholds

Evaluated per pillar on every pillar save. Source of truth: `pillar_daily_entries`.

| From     | To       | Window | Required |
|----------|----------|--------|----------|
| Tuning   | Jamming  | 7 days | 4 of 7   |
| Jamming  | Grooving | 14 days | 10 of 14 |
| Grooving | Soloing  | 60 days | 48 of 60 |

Window = strictly the last N calendar days from today (sliding, not fixed blocks).
Past completions that fall outside the window do not count.

## v3 Duration Goal Caps (enforced in application code)

| Level    | Max Duration Goals | Destination Goals |
|----------|--------------------|-------------------|
| Tuning   | 1                  | None              |
| Jamming  | 2                  | None              |
| Grooving | 3                  | Up to 3 per pillar |
| Soloing  | 4                  | Unlimited         |

## v3 Challenge Duration Options

Available to all users at onboarding and challenge restart: **21, 30, 60, 90, 100 days**.
14-day option removed in v3. Pillar-level 7-day and 14-day cycles are internal
progression windows, not user-selectable challenge lengths.

---

---

## Video System Rules

Video metadata lives in `/lib/constants.ts` — not in the database. Only watch state (`video_progress` table) lives in Supabase.

```ts
// In /lib/constants.ts
export const VIDEO_LIBRARY = {
  A1: {
    id: 'A1',
    title: "Why your life feels like it's passing you by",
    module: 'A',
    trigger: 'onboarding_day0',
    duration_seconds: 60,
    url: '' // filled in when videos are recorded
  },
  // ... all videos defined here
}
```

---

## Notification System

- Notifications are handled via scheduled logic (cron or Vercel edge functions) — not client-side
- Notification content lives in `/lib/constants.ts`
- Never hardcode notification copy inside components — reference constants
- Four notification tiers: `morning_anchor`, `evening_checkin`, `late_rescue`, `streak_at_risk`
- Milestone notifications trigger immediately on check-in completion (Day 1, Day 3, Day 4, Day 7)
- Miss-day recovery sends the morning after a missed day — grace tone, never shame
- Cron route handles level-specific blocks separately: level 1 (Tuning), level 2 (Jamming), level 3 (Grooving), level 4 (Soloing). Each level fetches its own active challenges independently.
- Soloing morning tone uses resolveMorningTone() — same function as Grooving, no fork. Returns 'reflective' when all pillars Anchored, 'mixed' when Developing pillars present.
- No evening or mid-week notifications at Soloing or Grooving by design.

---

## v3 Build Sequence

Build in this order. Do not skip ahead.

### Phase 1 — Foundation (COMPLETE)

All steps committed on branch `v3-phase1`.

- [x] Step 1 — Database migration: 7-table v3 schema (`user_profile`, `challenges`, `pillar_levels`, `duration_goals`, `destination_goals`, `pillar_daily_entries`, `consistency_profile_sessions`) + `selected_duration_days` column on `user_profile`
- [x] Step 2 — Core types and constants: full rewrite of `/lib/types.ts`, `/lib/constants.ts`; new `/lib/rolling-window.ts` with strict sliding window engine; updated `/lib/constants/consistencyProfileQuestions.ts` (relational pillar)
- [x] Step 3 — Onboarding flow: 4-step gate system (duration → videos → profile → goals); `/app/onboarding/**` router + step pages; all onboarding components; all `/api/onboarding/**` routes (duration, videos, profile, goals); challenge row created at goals step with correct start_date
- [x] Step 4 — Dashboard shell: `/app/dashboard/page.tsx` server component with parallel fetches; `DashboardHeader` (Day X of Y + progress bar); `DashboardShell` (pillar card loop); `PillarCard` (collapsed/expanded, goal checkboxes, per-pillar save); `DormantPillarCard` (muted state); `/api/checkin/route.ts` (upsert `pillar_daily_entries`, compute `completed` boolean)

### Phase 2 — Pillar Cards & Advancement Engine (COMPLETE)

- [x] Step 5 — Tuning pillar card: `TuningPillarCard.tsx` in `/components/dashboard`; 7-day rolling window dot visualization (filled/empty/ghost dots below goal checkboxes); level-aware routing added to `DashboardShell`; `dashboard/page.tsx` now fetches last 14 days of entries (window expanded in Step 6).
- [x] Step 6 — Jamming pillar card: `JammingPillarCard.tsx`; 14-day dot visualization as 2 rows of 7 via shared `DotRow` sub-component; level 2 routing in `DashboardShell`; window fetch expanded to 14 days.
- [x] Step 7 — Grooving pillar card: `GroovingPillarCard.tsx`; SVG progress ring on closed card (duration goals only); open card shows duration goals + destination goals below a divider (destination goals omitted if none exist); `dashboard/page.tsx` now fetches `destination_goals` where `status = 'active'`; level 3 routing in `DashboardShell`.
- [x] Step 8 — Soloing pillar card: `SoloingPillarCard.tsx`; identical to Grooving card + identity framing line ("You've made this part of who you are.") at top of expanded panel; level 4 routing in `DashboardShell`; generic `PillarCard` retained as safety-net fallback only.
- [x] Step 9 — Rolling window advancement engine: `/api/checkin/route.ts` runs `evaluateRollingWindow` after every completed save (fetches current level + last 60 days of entries in parallel); writes new level to `pillar_levels` on `shouldAdvance`; returns `{ advanced, newLevel }` in response; `TuningPillarCard`, `JammingPillarCard`, `GroovingPillarCard` show an in-card toast on advancement and call `router.refresh()` after 2.5 seconds to re-render the server component with the new level's card.

### Phase 3 — Goal Management (COMPLETE)

#### Architecture Overview

Goal editing uses a shared `GoalEditorCard` component that operates in two modes:

- `context: 'onboarding'` — local state + callbacks, no direct API calls; batch-saved when user taps "Start My Challenge →"
- `context: 'mid-challenge'` — calls `/api/goals/duration` directly on add/remove; immediately persists

This single component replaces the existing `GoalsFlow` + `GoalSetupCard` in onboarding AND powers the `/goals` page for mid-challenge editing.

#### Files to Create

```
/app/goals/page.tsx                       — Goals page (server component; fetches all pillars' goals)
/app/api/goals/duration/route.ts          — POST (add goal), DELETE (soft-delete via is_active=false)
/app/api/goals/destination/route.ts       — POST (add), PATCH (release/edit), DELETE
/components/goals/GoalEditorCard.tsx      — Shared pillar goal editor; context prop switches mode
/components/goals/GoalInputRow.tsx        — Single goal text input with ACT validation checkboxes
/components/goals/ACTChecklist.tsx        — Attainable / Challenging / Trackable confirm checkboxes
/components/goals/GoalSuggestions.tsx     — Pre-written ACT suggestions (collapsible, tap to fill)
```

#### Files to Retire / Modify

- `GoalsFlow.tsx` and `GoalSetupCard.tsx` in `/components/onboarding` — retire; replace with `GoalEditorCard` in onboarding mode
- `/app/onboarding/goals/page.tsx` — update to use `GoalEditorCard` per pillar instead of `GoalsFlow`

#### ACT Goal Validation

Every new goal (duration or destination) must pass the ACT test before it can be saved:

- **A — Attainable**: the goal is physically possible on any given day
- **C — Challenging**: the goal requires intentional effort
- **T — Trackable**: the user can clearly determine at end of day whether they did it or not

All three checkboxes must be checked before the "Add Goal" button activates. This applies in both onboarding and mid-challenge contexts.

#### Goal Suggestions (`DURATION_GOAL_SUGGESTIONS` in `/lib/constants.ts`)

Pre-written suggestions per pillar. Tap a suggestion to populate the goal text field. User may still edit the text after selecting. Suggestions are ACT-compliant by design so checkboxes auto-check on selection.

```ts
export const DURATION_GOAL_SUGGESTIONS: Record<PillarName, string[]> = {
  spiritual: [ ... ],   // e.g. "Read scripture for 10 minutes"
  physical:  [ ... ],   // e.g. "Complete a 20-minute workout"
  nutritional: [ ... ], // e.g. "Eat a whole-food breakfast"
  personal:  [ ... ],   // e.g. "Read for 20 minutes"
  relational: [ ... ],  // e.g. "Have a meaningful conversation with someone I care about"
                        // relational suggestions updated: removed missional framing
}
```

#### Onboarding Changes (Step 10)

- All 5 pillars shown in onboarding goals screen (current v3 behavior preserved — no change)
- Duration goals only at onboarding. Destination goals are not available until mid-challenge.
- Grooving+ pillars: show inline note beneath duration goals — *"Destination goals can be added once you begin your journey."* (shown in the open pillar card on the dashboard, not on the onboarding screen)
- Onboarding goal setup saves as batch when user taps "Start My Challenge →" (no per-save API calls during onboarding)

#### Goal Cap Enforcement

Enforced server-side in `/api/goals/duration` (and client-side: "Add" button disabled when cap reached):

| Level | Duration Goals (max) | Destination Goals (max) |
|-------|---------------------|------------------------|
| Tuning (1) | 1 | 0 — not available |
| Jamming (2) | 2 | 0 — not available |
| Grooving (3) | 3 | 3 per pillar |
| Soloing (4) | 4 | Unlimited |

#### Build Steps

- [x] Step 10 — Mid-challenge duration goal editing: `GoalEditorCard` (mid-challenge context), `GoalInputRow`, `ACTChecklist`, `GoalSuggestions`; `/app/(app)/goals/page.tsx`; `/api/goals/duration` (POST add, DELETE soft-delete); cap enforced; replaced `GoalsFlow` in onboarding with `OnboardingGoalsClient` + `GoalEditorCard` (onboarding context) + batch-save preserved; bottom nav shell built with `(app)` route group; `BottomNav` component with route-based active state
- [x] Step 11 — Destination goal setup and management: `DestinationGoalSection` component; `/api/goals/destination` (POST add, PATCH complete/release); `GoalEditorCard` extended with destination section (Grooving+ only, no ACT gate); Goals page fetches and passes destination goals; empty-state note in Grooving/Soloing dashboard cards; cap enforced (Grooving: 3, Soloing: unlimited)

### Phase 4 — Dashboard Day Navigator + History Week Grid (COMPLETE)

No new DB migration — uses existing `pillar_daily_entries`. Two connected features built in one step.

#### Dashboard Day Navigator

Added to `/app/(app)/dashboard/page.tsx` and `DashboardShell`. URL-based: `/dashboard?date=YYYY-MM-DD`. Viewing a past day pre-populates all pillar cards with that day's entries; saves go to the correct past date. `/api/checkin` updated to accept optional `entry_date`.

#### History Page — Week at a Glance

Sun–Sat calendar grid. Rows per active pillar + ALL row. Cells show duration goal completion %, color-coded (green ≥80%, yellow 40–79%, red <40%). Tapping a cell navigates to `/dashboard?date=...` for retroactive editing.

#### Files to Create

```
/components/dashboard/DayNavigator.tsx       — day nav card with < prev / next > arrows
/components/history/HistoryWeekGrid.tsx      — week grid client component; Prev/Next week navigation
```

#### Files to Modify

```
/app/api/checkin/route.ts                    — accept optional entry_date in body
/app/(app)/dashboard/page.tsx                — read date search param; expand window fetch to full challenge
/components/dashboard/DashboardShell.tsx     — add DayNavigator; pass viewingDate to pillar cards
/app/(app)/history/page.tsx                  — replace Coming Soon with full server component
/components/dashboard/TuningPillarCard.tsx   — add entryDate prop
/components/dashboard/JammingPillarCard.tsx  — add entryDate prop
/components/dashboard/GroovingPillarCard.tsx — add entryDate prop
/components/dashboard/SoloingPillarCard.tsx  — add entryDate prop
/components/dashboard/PillarCard.tsx         — add entryDate prop
/lib/constants.ts                            — add getWeekStart(dateStr) helper
```

#### Data

- `challenges` (start_date, duration_days)
- `pillar_daily_entries` (all entries for this challenge_id, from start_date to today)
- `pillar_levels` (which pillars are active)
- `duration_goals` (is_active = true — for % calculation in week grid)

#### Build Steps

- [x] Step 12 — Dashboard day navigator + History week grid: `DayNavigator`, `HistoryWeekGrid`; `/api/checkin` updated for optional `entry_date` (retroactive edits never trigger advancement); all pillar cards receive `entryDate` prop; dot windows end at `viewingDate`; history server component; `getWeekStart` helper in `constants.ts`

### Phase 5 — Groups (COMPLETE)

Three new tables added via migration `20260410000002_v3_groups.sql` (confirmed run): `consistency_groups`, `group_members`, `group_daily_status`.

#### DB Migration

New file: `supabase/migrations/20260410000002_v3_groups.sql`

```sql
consistency_groups (id, user_id, name, invite_code unique, max_members default 10, status default 'active', created_at)
group_members     (id, group_id FK, user_id, display_name, joined_at, is_active default true)
group_daily_status(id, group_id FK, user_id, status_date, completed, UNIQUE(group_id, user_id, status_date))
```

RLS: anon key = own rows only; service role bypasses for writes.

#### API Routes

```
/app/api/groups/route.ts              — GET (list my groups), POST (create)
/app/api/groups/[id]/route.ts         — GET (group + members + today's status)
/app/api/groups/[id]/members/route.ts — DELETE (leave or remove member)
/app/api/groups/[id]/manage/route.ts  — PATCH (rename, toggle invite, pause/archive)
/app/api/groups/join/route.ts         — POST (join by invite code)
```

#### Files to Create

```
/app/(app)/groups/page.tsx            — replace Coming Soon; server component
/app/join/[inviteCode]/page.tsx       — rebuilt; reads invite code, joins group, redirects to /groups
/components/groups/GroupView.tsx      — empty state or group list
/components/groups/GroupCard.tsx      — group + members + today check-in dots
/components/groups/CreateGroupModal.tsx
/components/groups/JoinGroupModal.tsx
/components/groups/GroupManageSheet.tsx — rename, invite toggle, remove members, delete
```

#### Daily Status Sync

On every pillar save in `/api/checkin/`, if user belongs to any groups, upsert `group_daily_status` with the overall daily `completed` boolean.

#### Additional Changes (Step 14)

- `UserAvatarMenu` added to `components/shared/`; rendered in `app/(app)/layout.tsx` top bar
- Progress ring percentage label added center of SVG ring in `GroovingPillarCard` and `SoloingPillarCard`
- Groups feature uses binary check-in indicator: empty circle → green filled on any pillar completion
- Group status sync in `/api/checkin` is non-blocking (`void syncGroupDailyStatus(...)`) — failure never breaks checkin
- No Pause feature: groups are active or deleted only — pause deferred to Step 17 (Challenge Completion)

#### Build Steps

- [x] Step 13 — Groups DB migration: `20260410000002_v3_groups.sql`; confirmed run in Supabase SQL Editor; creates `consistency_groups`, `group_members`, `group_daily_status` with RLS
- [x] Step 14 — Groups API + UI: all routes + components listed above; `GroupView`, `GroupCard`, `CreateGroupModal`, `JoinGroupModal`, `GroupManageSheet`; `/app/join/[inviteCode]/page.tsx`; daily status sync in `/api/checkin/`; `UserAvatarMenu` in shared top bar; progress ring % labels on Grooving/Soloing cards; fixed `user_profile` table name in dashboard/history/goals

### Phase 6 — Clarity Videos & Coaching

- [x] Step 15 — Clarity video screen: `video_progress` table migration (Option A — new table, reusable for Step 16); `PUT /api/onboarding/videos` marks individual videos watched; `ClarityVideoCard` redesigned as 3D gray push button with "Press to Play Video" / "Rewatch Video" label and checkmark on completion; `ClarityVideosScreen` gates "Continue" button until all 3 videos clicked; page restores watch state from DB on revisit; populate `url` in `CLARITY_VIDEOS` constant when recordings are ready
- [x] Step 16 — Per-level coaching video cards: `pulse_state` + `pulse_updated_at` added to `challenges` (migration 20260410000004); `computePulseState()` in `lib/pulse.ts`; `/api/checkin` updates pulse state non-blockingly after every today save; `VIDEO_LIBRARY` (all A/B/C/D/J/G series) + `selectTuningVideo/selectJammingVideo/selectGroovingVideo` helpers in `lib/constants.ts`; `VideoModal` shared component (slides up from bottom, marks watched on open); Video button on `TuningPillarCard`, `JammingPillarCard`, `GroovingPillarCard` (play icon → checkmark after watched, stops header expand propagation); Tuning: pillar intro on Day 1, stall→C4 after 3 missed days, D-series otherwise (shared across all Tuning pillars); Jamming/Grooving: pulse-driven video selection; Soloing: no video button; `/api/videos/watched` PUT route; `VideoLibrary` component with section groupings and watched checkboxes; `/videos` page fully built
- [x] Step 16b — Life Pause feature: `20260410000005_challenge_pause.sql` (6 new columns on `challenges`); `getEffectiveChallengeDay()` in `lib/constants.ts`; `Challenge` interface updated; `/api/challenges/pause` (POST immediate/scheduled, DELETE cancel); `/api/challenges/resume` (POST, accumulates pause_days_used); `/api/checkin` 403 guard when paused; `dashboard/page.tsx` auto-activates scheduled pauses on load + uses effective day; `PausedDashboard` component (freeze view + Resume button); `LifePauseBanner` (taking_on_water trigger, dismissible, one-tap pause or schedule link); `DashboardHeader` gets isPaused prop (amber badge + bar); `DashboardShell` renders paused/banner states; `ChallengePauseTools` component originally on Goals page (immediate pause form, scheduled pause form, cancel, resume) — **relocated to Settings page in May 2026** (see "Post-Code-Review Round 2" section below)

#### Life Pause Architecture Notes

- `pause_days_used` accumulates at resume time only — does NOT include the currently-active pause
- `getEffectiveChallengeDay()` freezes at paused_at day when paused; subtracts pause_days_used when running
- Scheduled pause auto-activates server-side in `dashboard/page.tsx` on every page load — no cron needed
- 14-day maximum enforced in `/api/challenges/pause`; remaining days shown in Goals Challenge Tools
- Groups: paused user simply shows as not checked in — no special handling needed
- Resume API returns `{ pausedDays }` — client shows "Welcome back. You paused for X days." toast

### Phase 7 — Challenge Completion & Restart (COMPLETE)

No new DB migration required — uses existing `challenges` table `status` and `completed_at` columns.

#### Detection Logic

A challenge is complete when:
```ts
getEffectiveChallengeDay(challenge) > challenge.duration_days
```
This uses the pause-adjusted day formula, so paused days don't count against the user.

Detection happens in `dashboard/page.tsx` — if the challenge is active and the effective day exceeds the duration, mark it complete (server-side write) and redirect to `/completion`.

#### Step 17 — Challenge Completion Screen

**Files to create:**
```
/app/(app)/completion/page.tsx          — server component; redirects here from dashboard when complete
/components/completion/CompletionScreen.tsx — client component; stats + CTAs
```

**Files to modify:**
```
/app/(app)/dashboard/page.tsx           — add completion check before rendering DashboardShell;
                                          write status='completed' + completed_at; redirect to /completion
/app/api/challenges/complete/route.ts   — POST; sets challenges.status='completed', completed_at=now()
```

**Completion screen contents:**
- Celebration header: "You did it." or equivalent
- Challenge summary: duration (e.g. "30 Days"), dates (start → end)
- Per-pillar summary card: final level reached (Tuning/Jamming/Grooving/Soloing) + completion % across the challenge
- Overall consistency % (total completed days / total challenge days)
- Two CTAs:
  - "Start a New Challenge" — triggers Step 18 restart flow
  - "Keep Going" (optional) — only shown if David wants a continue-without-restart option; deferred until he decides

**Data needed (all from existing tables):**
- `challenges` — start_date, duration_days, pause_days_used
- `pillar_levels` — final level per pillar
- `pillar_daily_entries` — count of completed entries per pillar over challenge window

**Architecture notes:**
- No new Supabase migration needed
- `completed_at` is already on `challenges` table
- Write `status = 'completed'` in `dashboard/page.tsx` server-side before redirect (or via `/api/challenges/complete` POST)
- `completion/page.tsx` must guard: if `challenges.status !== 'completed'`, redirect to `/dashboard`
- `user_profile.active_challenge_id` is NOT cleared on completion — still needed for restart flow (Step 18 creates a new challenge and points `active_challenge_id` to it)

#### Step 18 — Challenge Restart

**Files to create:**
```
/app/api/challenges/restart/route.ts    — POST; creates new challenge row, updates user_profile
```

**Files to modify:**
```
/components/completion/CompletionScreen.tsx — "Start a New Challenge" button calls /api/challenges/restart
/app/onboarding/profile/page.tsx        — reachable from restart flow for optional Consistency Profile retake
```

**Restart flow:**
1. User taps "Start a New Challenge" on the completion screen
2. Client POSTs to `/api/challenges/restart` with `{ retakeProfile: boolean }`
3. API creates a new `challenges` row:
   - `user_id` = userId
   - `start_date` = today
   - `duration_days` = same as previous challenge (or allow re-selection — TBD with David)
   - `status` = 'active'
   - `pause_days_used` = 0 (fresh start)
   - `pulse_state` = 'smooth_sailing'
4. API updates `user_profile.active_challenge_id` to the new challenge ID
5. If `retakeProfile = true`: redirect to `/onboarding/profile` (sets `consistency_profile_completed = false` first so the gate re-opens); pillar levels re-seeded from new scores
6. If `retakeProfile = false`: pillar levels carry forward unchanged; redirect to `/dashboard`

**Architecture notes:**
- Duration selection on restart: simplest approach is to carry forward the previous `duration_days`. If David wants the user to re-select, add a duration picker to the completion screen before triggering restart.
- Pillar levels carry forward by default — user does not lose Jamming/Grooving/Soloing status they earned
- `goals_setup_completed`, `onboarding_completed` remain `true` — user does not re-do onboarding
- Only `consistency_profile_completed` is temporarily set to `false` if `retakeProfile = true`
- Rolling window evaluation for the new challenge starts fresh from the new `start_date`
- Old `pillar_daily_entries` from the previous challenge are preserved in the DB for history but scoped by `challenge_id`, so they do not interfere with the new challenge

#### Build Steps

- [x] Step 17 — Challenge completion screen: completion check in `dashboard/page.tsx` (server-side write + redirect); `/api/challenges/complete` POST (idempotent); `/app/(app)/completion/page.tsx` server component (guards status !== 'completed' → redirect /dashboard); `CompletionScreen` client component — "You did it." header, challenge summary card with dates + overall %, per-pillar rows in PILLAR_CONFIG colors, "Start a New Challenge" CTA entry point into Step 18 flow
- [x] Step 18 — Challenge completion countdown + restart + mid-challenge duration change:
  - `CompletionCountdownBanner.tsx` — 5 distinct messages for days 5 through 1; dark blue gradient card; rendered in `DashboardShell` when `daysRemaining` 1–5, today view only, not paused
  - `/api/challenges/restart` POST — accepts `{ retakeProfile, durationDays }`; creates new challenge row (fresh start_date, pulse reset, pause_days_used=0); updates `active_challenge_id`; if retake: resets `consistency_profile_completed`; returns `{ redirectTo }`
  - `CompletionScreen.tsx` extended — 3-step restart flow: idle → choose type (keep profile / retake profile) → choose duration (preset grid); `useRouter` redirect on success
  - `ProfileFlow.tsx` — `isRetake` prop added; redirects to `/dashboard` after retake instead of `/onboarding/goals`
  - `/app/onboarding/profile/page.tsx` — reads `?retake=1` search param; skips "already completed" redirect when retaking
  - `/api/challenges/duration` PATCH — accepts any positive integer (presets or "Add a Week" non-preset values); returns `{ wouldCompleteNow }` when new duration < current effective day
  - `ChallengeDurationEditor.tsx` — 3D pill button ("X days · Change Duration?") → expands to preset grid + "Add a Week" (+7 days to current); warning modal if shortening past current day; placed at top of Goals page above pillar cards
  - `app/(app)/goals/page.tsx` — expanded challenge select to include `id, duration_days, start_date, paused_at`; added `ChallengeDurationEditor` above pillar cards (hidden when paused); `getEffectiveChallengeDay` used for current day
  - `lib/types.ts` — `Challenge.duration_days` changed from `ChallengeDuration` to `number` (accepts any integer after "Add a Week")

---

### Phase 8 — Settings (COMPLETE)

No new DB migration required — all data fetched from existing tables and Clerk.

#### Purpose

Account management accessible from the avatar menu. Settings is not a primary navigation feature — it lives behind `UserAvatarMenu` in the top bar. It is not in the bottom nav.

#### Entry Point

`UserAvatarMenu` dropdown gains a "Settings" item above Sign Out that navigates to `/settings`. Sign out remains in the avatar menu only — it does not move to Settings.

#### Settings Page Layout

Three sections rendered vertically:

**1. Account**
Display name (Clerk `firstName + lastName`) and email address. Read-only in v3.

**2. Challenge**
Current challenge length display + `ChallengeDurationEditor` (moved from the Goals page). Shows current duration and allows switching to any preset or adding a week. When paused: shows one-liner "Duration changes are unavailable while your challenge is paused." `ChallengeDurationEditor` file path stays at `/components/goals/ChallengeDurationEditor.tsx` — only the importing page changes.

**3. Consistency Profile**
Single line: "Retake Consistency Profile Questionnaire" + button. Navigates to `/onboarding/profile?retake=1`. After retake: redirects to `/dashboard`. No change to the existing retake flow.

#### Files Created

```
/app/(app)/settings/page.tsx              — server component; Clerk currentUser() for name/email;
                                            challenge fetch for duration editor
/components/settings/AccountSection.tsx   — display name + email (read-only)
/components/settings/ChallengeSection.tsx — current duration display + ChallengeDurationEditor;
                                            one-liner shown when paused instead of hiding
/components/settings/ProfileSection.tsx   — "Retake Consistency Profile Questionnaire" button
```

#### Files Modified

```
/components/shared/UserAvatarMenu.tsx     — "Settings" link added above Sign Out (with border-t divider)
/app/(app)/goals/page.tsx                 — ChallengeDurationEditor removed; challenge select
                                            trimmed to is_paused, pause_days_used,
                                            scheduled_pause_date, scheduled_pause_reason only;
                                            getEffectiveChallengeDay import removed
```

#### Data Fetched in settings/page.tsx

```ts
// Clerk
currentUser()              // firstName, lastName, emailAddresses[0]

// Supabase
user_profile               // active_challenge_id
challenges                 // id, duration_days, start_date, is_paused, paused_at, pause_days_used
```

No `consistency_profile_sessions` fetch — the Profile section is a retake button only, no score display.

#### Architecture Decisions

- Settings is avatar-menu-only — not in bottom nav. It is account management, not a primary feature.
- Sign out stays in the avatar menu dropdown only — not duplicated in Settings.
- `ChallengeDurationEditor` file path unchanged — only the importing page changes (Goals → Settings).
- Profile retake from Settings → `/onboarding/profile?retake=1` → existing retake flow → `/dashboard`.
- Paused challenge: ChallengeSection shows a one-liner instead of hiding the section entirely.

#### Build Steps

- [x] Step 19 — Settings page: `/app/(app)/settings/page.tsx` (Clerk + Supabase fetch); `AccountSection`, `ChallengeSection`, `ProfileSection` components in `/components/settings/`; "Settings" added to `UserAvatarMenu` above Sign Out with border-t divider; `ChallengeDurationEditor` moved from Goals page to Settings (file path unchanged); Goals page challenge select simplified to 4 fields only; `getEffectiveChallengeDay` import removed from Goals page

---

### History Page — Visual Polish (COMPLETE)

Applied to `HistoryWeekGrid.tsx`, `HistoryMonthGrid.tsx`, `HistoryProgressReport.tsx`.

#### Week View

- Container: `bg-white` → `bg-slate-700` (matches active tab pill color)
- Empty cells (no entry): `bg-slate-100` → `bg-slate-600` (medium gray)
- Future / pre-challenge cells: `bg-slate-100` → `bg-slate-800` (darker, clearly inactive)
- Pillar label column: text-only colored word → rounded chip with pillar `background` color + `title` text color
- Nav arrows, week range, ALL row: adjusted for dark background (white/slate-300 text, slate-600 hover)
- Completion colors: pastel → solid (`bg-emerald-600`, `bg-amber-500`, `bg-red-600`), all `text-white`

#### Month View

- Container: `bg-white` → `bg-slate-700`
- All numbered day cells (valid, invalid, today): always `bg-slate-600` base — no transparent cells
- Days-of-week header (Sun–Sat): `text-slate-400` → `text-slate-300`
- Invalid day numbers (future / pre-challenge): `text-slate-600` (invisible) → `text-slate-300` (light gray, visible)
- Today with no entry: `ring-slate-300` → `ring-white`
- Completion colors: same solid palette as Week view

#### Progress View

- Pillar Progress chart: header → `bg-slate-700`; SVG area + legend → `bg-slate-600`; grid lines and axis labels lightened for dark background
- Pillar Summary: header → `bg-slate-700`; each pillar row → full pillar `background` color; all text uses `title` / `subtitle` colors from `PILLAR_CONFIG`; green/yellow/red counts use `text-emerald-300`, `text-amber-300`, `text-red-300`

---

### Phase 9 — Username System + Internal Groups Redesign (COMPLETE)

Two migrations required. Build in order: Phase A (username) first, then Phase B (groups).

#### Purpose

Every user needs a persistent username within the app that becomes their identity in groups. The current Clerk display-name approach is fragile (names change, names aren't unique) and exposes personal names. Simultaneously, the invite-code group join flow is being retired in favor of an internal invitation/request system with public/private group visibility.

---

#### Phase A — Username System

##### DB Migration (new file: `20260410000006_username.sql`)

```sql
-- Add to user_profile
ALTER TABLE user_profile
  ADD COLUMN username text UNIQUE,
  ADD COLUMN username_set boolean NOT NULL DEFAULT false;

-- Lowercase constraint (subsequently dropped — see note below)
ALTER TABLE user_profile
  ADD CONSTRAINT username_lowercase CHECK (username = lower(username));
```

> **Post-Phase 9 schema update (applied via direct SQL, no migration file):**
> The `CHECK (username = lower(username))` constraint and the exact `UNIQUE` index on `username`
> were dropped. Replaced with `CREATE UNIQUE INDEX user_profile_username_ci ON user_profile (lower(username))`
> for case-insensitive uniqueness while allowing mixed-case storage.
> "David1" and "david1" are treated as the same username but the stored value preserves the user's casing.

##### Onboarding Gate Update

`username_set` becomes the **first gate** checked before all existing steps. Updated onboarding sequence:

```
0. username_set               → /onboarding/username  (NEW — first step)
1. challenge_duration_selected → /onboarding/duration
2. clarity_videos_seen         → /onboarding/videos
3. consistency_profile_completed → /onboarding/profile
4. goals_setup_completed       → /onboarding/goals
5. onboarding_completed        → /dashboard
```

##### Files to Create

```
/app/onboarding/username/page.tsx              — server component; checks username_set gate;
                                                 redirects to /onboarding/duration if already set
/components/onboarding/UsernameSetupScreen.tsx — client component; username text input;
                                                 real-time availability check (debounced GET);
                                                 "Continue" button calls POST then advances gate
/app/api/onboarding/username/route.ts          — GET ?username= (availability check, returns { available });
                                                 POST { username } (saves to user_profile, sets username_set=true)
/app/api/settings/username/route.ts            — PATCH { username }; updates user_profile.username;
                                                 cascades update to ALL group_members.display_name rows
                                                 where group_members.user_id = this userId
```

##### Files to Modify

```
/app/onboarding/page.tsx (or router)           — add username_set as first gate check
/components/settings/AccountSection.tsx        — show username instead of Clerk name;
                                                 add inline edit with availability check on submit;
                                                 calls PATCH /api/settings/username
/lib/types.ts                                  — UserProfile: add username: string | null, username_set: boolean
```

##### Architecture Notes

- `group_members.display_name` populated from `username` (not Clerk name) at join/create time — affects `/api/groups` POST and `/api/groups/join` (or its replacement in Phase B)
- Username must be lowercase, 3–20 characters, alphanumeric + underscore only (enforce in API + client validation)
- Availability check is case-insensitive: `lower(username) = lower(:input)`
- On username change: existing group_members rows updated atomically in the same DB transaction as the user_profile update
- `AccountSection.tsx` will show the `username` field instead of Clerk `firstName + lastName` after this step

##### Build Steps (Phase A)

- [x] Step 20 — Username system: DB migration `20260410000006_username.sql` (confirmed run); `/app/onboarding/username/page.tsx` + `UsernameSetupScreen.tsx` (`'use client'`, debounced availability check, `@`-prefixed input, 3–20 char alphanumeric + underscore); `/api/onboarding/username` (GET availability + POST save, validates regex, excludes self); onboarding router gate updated (`username_set` first, fallback to `/onboarding/username`); `AccountSection.tsx` fully rewritten as `'use client'` with inline edit + `unchanged` state; `/api/settings/username` PATCH (update user_profile + cascade to group_members.display_name); `app/(app)/settings/page.tsx` fetches `username` from user_profile; groups POST + join routes use username instead of Clerk name; `lib/types.ts` UserProfile updated

---

#### Phase B — Internal Groups Redesign

##### DB Migration (new file: `20260410000007_groups_redesign.sql`)

```sql
-- Add public/private visibility to groups
ALTER TABLE consistency_groups
  ADD COLUMN is_public boolean NOT NULL DEFAULT true;

-- Invitation/request system
CREATE TABLE group_invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid NOT NULL REFERENCES consistency_groups(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('invitation', 'request')),
  from_user_id  text NOT NULL,
  to_user_id    text NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

-- Prevent duplicate pending invitations/requests
CREATE UNIQUE INDEX group_invitations_pending_unique
  ON group_invitations (group_id, from_user_id, to_user_id)
  WHERE status = 'pending';

-- RLS: users can read invitations where they are from_user_id or to_user_id
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
```

Note: `invite_code` column is left in `consistency_groups` but no longer used. No data migration required.

##### New API Routes

```
GET  /api/users/search?username=                    — find user by exact username (returns { userId, username }); used by owner when inviting
GET  /api/groups/discover?q=                        — search public groups by name (plain text, max 10) or by owner (@username prefix, max 20); includes owner_username on every result
GET  /api/groups/notifications                      — pending invitations/requests for current user (type='invitation', to_user_id=userId, status='pending', expires_at > now())
POST /api/groups/[id]/invite                        — owner only; POST { toUsername }; creates group_invitations row (type='invitation'); resolves username → user_id via user_profile lookup
POST /api/groups/invitations/[invitationId]/respond — POST { action: 'accept'|'decline' }; updates status; if accepted: inserts group_members row with username as display_name
GET  /api/groups/requests                           — owner only; pending join requests for a group (type='request', group_id=id, status='pending')
```

##### Retired API Routes

```
POST /api/groups/join          — retired; replaced by invitation/request system
```

##### Modified API Routes

```
POST /api/groups               — remove invite_code generation; no change to rest
GET  /api/groups/[id]          — include is_public in response
PATCH /api/groups/[id]/manage  — add is_public toggle support; remove invite code management
```

##### New Components

```
/components/groups/GroupDiscoverModal.tsx    — replaces JoinGroupModal; search public groups by name;
                                              public group: "Request to Join" button (creates request);
                                              private group: not shown in search results
/components/groups/GroupInvitePanel.tsx      — shown inside GroupManageSheet for group owners;
                                              username search input → send invitation;
                                              list of pending outgoing invitations with cancel option
/components/groups/GroupNotificationsCard.tsx — shown at top of GroupView when pending invitations exist;
                                               each row: group name + accept/decline buttons inline
```

##### Modified Components

```
/components/groups/GroupManageSheet.tsx     — remove invite code / share link section;
                                              add public/private toggle switch;
                                              add GroupInvitePanel for owners
/components/groups/GroupView.tsx            — replace "Join with code" CTA with "Find a group" button
                                              (opens GroupDiscoverModal);
                                              add GroupNotificationsCard above group list when notifications > 0
/components/groups/GroupCard.tsx            — remove invite_code pill; member display uses username
/app/(app)/groups/page.tsx                  — fetch notifications count to pass to GroupView
/lib/types.ts                               — ConsistencyGroup: add is_public: boolean;
                                              new GroupInvitation interface
```

##### Retired Files

```
/components/groups/JoinGroupModal.tsx       — replaced by GroupDiscoverModal.tsx
/app/join/[inviteCode]/page.tsx             — retired entirely; route returns 404 or redirects to /groups
```

##### Flow Descriptions

**Joining a public group:**
1. User taps "Find a group" in GroupView → GroupDiscoverModal opens
2. User searches by group name → results show public groups only
3. User taps "Request to Join" → POST `/api/groups/[id]/invite` with type='request'
4. Group owner sees pending request in GroupManageSheet → accept or decline

**Joining a private group:**
1. Owner must invite the user by username via GroupInvitePanel inside GroupManageSheet
2. POST `/api/groups/[id]/invite` with type='invitation', toUsername=target
3. Invited user sees GroupNotificationsCard in their GroupView → accept or decline

**Auto-expiry:**
- `expires_at` is set to `now() + interval '7 days'` at creation time
- All notification queries filter `expires_at > now()` — expired rows naturally disappear
- No cron job needed; stale rows remain in DB but are never surfaced

##### Build Steps (Phase B)

- [x] Step 21 — Internal groups redesign: DB migration `20260410000007_groups_redesign.sql` (is_public + group_invitations table, confirmed run); DB migration `20260410000008_group_name_unique_per_owner.sql` (per-owner case-insensitive unique index, confirmed run); new API routes: `users/search` (exact username lookup), `groups/discover` (name or @username search, exports `DiscoverResult`), `groups/notifications` (pending invitations for current user), `groups/[id]/invite` (GET pending outgoing, POST create invitation/request, DELETE cancel), `groups/invitations/[id]/respond` (accept/decline, `memberUserId` pattern), `groups/requests` (owner sees pending requests); `GroupDiscoverModal.tsx` (replaces JoinGroupModal; detects `@` prefix; @-search groups by owner; name-search flat list); `GroupInvitePanel.tsx` (inside GroupManageSheet; username search → send invitation; pending list with cancel); `GroupNotificationsCard.tsx` (handles both invitation + request types; optimistic removal); modified: `GroupManageSheet` (public/private toggle + GroupInvitePanel, pb-24 for bottom nav clearance), `GroupView` (GroupDiscoverModal, GroupNotificationsCard, side-by-side create + find buttons), `GroupCard` (@ prefix on display_name, Private badge, no invite_code pill), `groups POST` (5-group cap, username for display_name, 23505 catch), `groups/[id]/manage` (toggle_public replaces toggle_invite, 23505 catch on rename), `groups/page.tsx` (no type filter on notifications — fetches both invitations and requests), `CreateGroupModal` (surfaces API error), `lib/types.ts` (is_public + GroupInvitation interface); retired: `JoinGroupModal.tsx` (deleted), `/join/[inviteCode]/page.tsx` (redirects to /groups), `/api/groups/join` (retired)
  > **Bug note:** The `toggle_public` action was broken in the initial Step 21 build — `GroupManageSheet` sent `action: 'toggle_public'` but the API's `ManageAction` union only accepted `'rename' | 'toggle_invite' | 'delete'`, causing silent failure. Fixed in the code review & remediation pass (see below).

---

### Code Review & Remediation (COMPLETE)

Full audit (`CODE_REVIEW.md` → `CODE_REVIEW_FINDINGS.md`, 45 findings). Three tiers of fixes applied across one session. No new DB migrations or features — corrections only.

#### Security & Broken Features (Tier 1)

- **`middleware.ts`** — 5 app routes (`/history`, `/videos`, `/settings`, `/groups`, `/completion`) were missing from the `isProtectedRoute` matcher, leaving them unauthenticated. Added.
- **All 5 pillar cards** — `handleSave` silently swallowed API errors (showed "Saved ✓" on failure). Added `saveError` state + try/catch/finally + `res.ok` guard. Checkboxes stay checked on failure — user retries without re-checking.
- **`/api/checkin`** — Challenge ownership was not verified: any authenticated user could check in against any `challengeId` they knew. Fixed by adding `.eq('user_id', userId)` to the pause-check query (ownership and pause state now verified in one query). Also changed `void updatePulseState(...)` → `await updatePulseState(...)` — the `void` form was silently dropped by Vercel's serverless execution model.
- **`/api/groups/[id]/manage`** — `toggle_public` action was completely unhandled (Step 21 bug). Added to `ManageAction` union, validator, and handler branch.

#### Data Integrity & Error Handling (Tier 2)

- **`GroupNotificationsCard`** — Optimistic removal fired before `res.ok` check; errors were invisible. Fixed: removal only fires post-confirmation; `respondError` state surfaces failures.
- **`/api/groups/invitations/[id]/respond`** — 4 DB writes had no error handling. All now guarded; the member re-activate path is most critical (returns 500 before marking invitation accepted if reactivation fails).
- **`OnboardingGoalsClient`** — `handleSubmit` had no error handling. Added try/catch/finally + `submitError` state.
- **`ProfileFlow`** — Same gap as OnboardingGoalsClient. Added error state; on failure: stays on current screen, message shown, retry available.
- **`/api/videos/watched`** — No `videoId` validation. Added guard against `VIDEO_LIBRARY` keys; unknown IDs return 400.
- **`dashboard/page.tsx`** — Removed internal `fetch('/api/challenges/complete')` call (server component making an HTTP round-trip to itself, then doing the direct DB write anyway). Consolidated 3 separate Supabase client instantiations to 1.

#### Performance & Duplication (Tier 3)

- **`lib/constants.ts`** — Added `export const MAX_PAUSE_DAYS = 14` (was hardcoded in 2 places) and `export function addDays(dateStr, n)` (was duplicated in 3 components). All consumers now import from constants.
- **`HistoryProgressReport`** — O(n²) render replaced with pre-indexed Maps (`"pillar|date"` key for entries, `PillarName` key for goals). Two separate day×pillar loops merged into one accumulator pass. Removes ~202,500 redundant operations per render on a 90-day 5-pillar challenge.
- **`DestinationGoalSection`** — `pillar: string` prop tightened to `pillar: PillarName`.
- **`/api/groups/route.ts`** — Phase 9 regression fixed: `currentUser()` from Clerk was still used for group `display_name` instead of `user_profile.username`. Removed Clerk import. `invite_code` now uses `crypto.randomUUID()` (retired feature; no collision-check loop needed).
- **`settings/page.tsx`** — Removed unnecessary `as Challenge` cast.

#### Build Steps (Tier 4 — COMPLETE)

- [x] `loading.tsx` and `error.tsx` added to all 6 route segments: `/dashboard`, `/history`, `/goals`, `/groups`, `/videos`, `/settings`
- [x] `HistoryMonthGrid` React key: empty cells `pad-${i}`, day cells `date` string

---

### Post-Code-Review — Timezone Fix (COMPLETE)

**Root cause:** `todayStr()` uses the JavaScript runtime's local timezone. On Vercel (UTC), this caused the server to flip to the next calendar day at 7 PM CDT, recording check-ins on the wrong date and silently skipping rolling-window advancement and group sync.

**Architecture:** Browser IANA timezone written to a `tz` cookie by `TzCookieWriter` on every page load. Server components and API routes read the cookie and pass it to `todayInTz(tz)`, a new server-safe helper in `lib/constants.ts`.

**Rule:** `todayStr()` is client-only. Any server component or API route that needs "today's date" must use `todayInTz(cookies().get('tz')?.value)` or `todayInTz(request.cookies.get('tz')?.value)`. `toISOString().split('T')[0]` is banned — it always returns UTC.

#### Files Changed

- `components/shared/TzCookieWriter.tsx` (NEW) — `'use client'`; writes `tz=<IANA>` cookie via `useEffect`
- `app/(app)/layout.tsx` — renders `<TzCookieWriter />`
- `lib/constants.ts` — added `todayInTz(tz?)`; fixed `rollingWindowDates` to use `Intl.DateTimeFormat`
- `lib/rolling-window.ts` — fixed `daysAgo` to use `Intl.DateTimeFormat`
- `app/(app)/dashboard/page.tsx` — reads `tz` cookie; uses `todayInTz(tz)` for `viewingDate` default and scheduled-pause check
- `app/api/checkin/route.ts` — reads `tz` cookie; `clientToday` replaces all `todayStr()` call sites including `updatePulseState` parameter

---

### Post-Code-Review Round 2 — Tier 1 (timezone hardening + pause UI restoration)

A second code-review pass (`CODE_REVIEW_FINDINGS2.md`, 76 findings) produced `CODE_REVIEW_PLAN2.md`, a three-tier remediation. **Tier 1 (timezone) shipped 2026-05-02** as commits `741abff` (Tier 1 timezone) and `b4ecb09` (pause UI restoration). Tier 2 and Tier 3 remain.

#### Why Tier 1 was needed
The Round 1 timezone fix added `todayInTz(tz)` and converted some call sites, but several server-side date paths were missed and the `paused_at` / `completed_at` columns were still written via `new Date().toISOString()` (UTC instant). After 7 PM CDT the user's local date and the UTC date disagreed, producing wrong day counters and skipped advancement evaluations.

#### Tier 1.1 — Required date params on 6 functions
The optional `today?` defaults on these were silently swallowing the bug. Made them required so the compiler enforces an explicit reference date at every call site:
- `evaluateRollingWindow`, `evaluateAllPillars`, `getWindowEntries` (`lib/rolling-window.ts`)
- `getDayNumber`, `rollingWindowDates`, `getEffectiveChallengeDay` (`lib/constants.ts`)
- Internal `daysAgo` helper retains its optional default (always called with explicit reference; default is dead code).

#### Tier 1.2 — All call sites converted
19 call sites fixed: 8 TypeScript compile errors surfaced by 1.1 plus 11 direct `todayStr()` / banned `Intl.DateTimeFormat` usages. Server components now read the `tz` cookie via `cookies()` from `'next/headers'`; API routes read it via `NextRequest.cookies`. **`todayStr()` is banned in server-side code.** Client components correctly retain `todayStr()` (the browser's timezone IS the user's timezone). Two retired files (`app/api/groups/join/route.ts`, `app/join/[inviteCode]/page.tsx`) intentionally skipped — they get deleted in Tier 2 Step 2.2.

#### Tier 1.3 — `paused_at` / `completed_at` write-time anchor
Anchored both columns to `` `${today}T12:00:00.000Z` `` at all 4 write sites:
- `app/api/challenges/pause/route.ts:87` (immediate pause)
- `app/(app)/dashboard/page.tsx:94` (auto-activate scheduled pause)
- `app/api/challenges/complete/route.ts` (POST complete) — also gained `NextRequest` + tz cookie plumbing
- `app/(app)/dashboard/page.tsx:124` (auto-mark complete on natural overrun)

**Why noon UTC works:** `.slice(0, 10)` always extracts the UTC date portion of the stored ISO string. Storing `${user_local_date}T12:00:00.000Z` means the read-back is timezone-independent — `.slice(0, 10)` returns the same date the user was on when they wrote it, regardless of which runtime reads it later. Existing rows written before Tier 1 may carry the wrong date; manual SQL correction acceptable.

#### Pause UI restoration (companion fix, commit `b4ecb09`)
While reviewing the pause path, discovered `ChallengePauseTools` was **orphaned**: the file existed in `components/goals/` but was no longer imported anywhere after a prior cleanup pass had silently removed it from the Goals page. Most users would never see any pause UI — the only working entry point was the reactive `LifePauseBanner` (only shown when pulse is `taking_on_water`), and even its "Schedule a Future Pause" link pointed to a dead anchor.

Re-wired `ChallengePauseTools` into the Settings page (where users naturally look for it) between the Challenge and Consistency Profile sections. Settings page query expanded to fetch `scheduled_pause_date` and `scheduled_pause_reason`. `LifePauseBanner` deep link updated from `/goals#challenge-tools` to `/settings#challenge-tools`. The `id="challenge-tools"` anchor on the component was already correct. File path of the component stays at `components/goals/ChallengePauseTools.tsx` — same precedent as `ChallengeDurationEditor`.

#### Architectural rules established by Tier 1
- **`todayStr()` is client-only.** Any server component or API route using it is a bug.
- **Server components read `tz` via `cookies().get('tz')?.value`** from `'next/headers'`.
- **API routes read `tz` via `request.cookies.get('tz')?.value`** — and must accept `NextRequest` (not bare `Request`) for this to type-check.
- **Date-anchored columns (`paused_at`, `completed_at`) must be written as `` `${today}T12:00:00.000Z` ``** — never `new Date().toISOString()`. Pure timestamp columns (`watched_at`, `joined_at`, expiry comparisons) keep `new Date().toISOString()`.
- **`new Date().toISOString().slice(0, 10)` is banned** — it always returns UTC.

#### Verification (pending user smoke tests in production)
Code is committed to local `main` and pushed by user. After Vercel deploys:
- Pause a challenge after 7 PM local → `challenges.paused_at` should show `<your_local_date>T12:00:00.000Z`
- Hit a natural completion after 7 PM local → `completed_at` should show `<your_local_date>T12:00:00.000Z`
- Check in a pillar after 7 PM → `pillar_daily_entries.entry_date` is your local date
- Open Settings → confirm Challenge Tools section appears between Challenge and Consistency Profile

---

### Post-Code-Review Round 2 — Tier 2 (security, broken features, TS strictness, a11y)

Tier 2 build complete 2026-05-03 across 8 build steps committed as `b6a1b7b`. Production smoke verification + push pending. Two follow-up housekeeping commits (`ea41ddc` untracking `.next/`, `e60ff2d` untracking `tsconfig.tsbuildinfo`) clear longstanding `git status` noise.

#### Step 2.1 — Username case-sensitivity (broken group invitations)
`users/search` and `groups/[id]/invite` lowercased the input and compared with `.eq()`, so any mixed-case username (e.g. "David1") was unfindable from the invite panel — the entire group invitation feature was silently broken for those users. Fix: drop `.toLowerCase()`, swap `.eq()` → `.ilike()`. `GroupInvitePanel` regex widened to allow A–Z.

#### Step 2.2 — Delete retired routes and dead files
Five dead files removed: `app/api/groups/join/route.ts`, `app/join/[inviteCode]/page.tsx`, `components/groups/JoinGroupModal.tsx` (all retired in Phase 9 when invite codes were replaced by the internal invitation/request system), `components/dashboard/DayNavigator.tsx` (orphaned after the iPhone-polish DashboardHeader merge), and the entire `lib/utils.ts` file (`daysUntil` and `generateInviteCode` had zero consumers).

#### Step 2.3 — SQL/LIKE injection in discover route
`app/api/groups/discover/route.ts` interpolated user input directly into `.ilike()` patterns. A `%` in the query enumerated all public groups or all usernames matching the prefix; `_` matched any single character. Fix: `query.replace(/[%_\\]/g, '\\$&')` before interpolation. Both name-search and `@username`-search paths escaped.

#### Step 2.4 — Other security fixes
- 5-group ownership cap: `groups POST` counts `consistency_groups` where `user_id = userId` AND `status = 'active'`, rejects 6th with 400.
- Onboarding goals idempotency: `app/api/onboarding/goals/route.ts` early-returns `{success:true}` if `goals_setup_completed` already true (prevents duplicate-row issue if user re-submits).
- 23505 catches on both username routes (`onboarding/username` + `settings/username`) → 409 "Username is already taken" on race.
- `/api(.*)` added to `middleware.ts` `isProtectedRoute` matcher (defense-in-depth — handlers already had `auth()` guards).
- `app/(app)/history/page.tsx` challenges fetch gained `.eq('user_id', userId)` (was previously trusting the join through `user_profile`).

#### Step 2.5 — Error handling
8 components wrapped each fetch handler in `try/catch/finally` with visible error state; loading state always cleared in `finally`. Fixed components: `GroupManageSheet` (4 handlers), `GroupView.handleAccepted` (new `acceptError` state), `GroupInvitePanel.handleCancel` (new `cancelError` state), `GroupDiscoverModal.handleRequest`, `CreateGroupModal.handleCreate` (also surfaces API error message), `ChallengePauseTools` (4 handlers + `cancelError` for scheduled-pause cancel), `DurationPicker` (new error state above Begin), `ClarityVideosScreen` (new error state above Continue, covers handleContinue + handleSkip).

3 API route fixes: `videos/watched` wraps `request.json()` (400 on invalid JSON); `groups/[id]/invite` DELETE adds `.select()` so it can return 404 when no row matched; `groups/[id]/invite` POST tightens `b.type` from cast-then-compare to `typeof !== 'string'` typeguard.

#### Step 2.6 — Next.js + Supabase pattern fixes
- `settings/page.tsx`: dropped `Promise.resolve(createServerSupabaseClient())` wrapper (split into `await` + sync call).
- `dashboard/page.tsx`: `const challenge` → `let challenge`; `Object.assign(challenge, refreshed)` → `challenge = refreshed`.
- `groups/page.tsx`: `searchParams: Promise<...>` → plain object (Next 14 canonical pattern, matches sibling pages like `app/onboarding/profile/page.tsx`).
- `api/checkin/route.ts`: `syncGroupDailyStatus` now accepts the supabase client from the caller instead of calling `createServerSupabaseClient()` a second time.
- `history/page.tsx`: 5 `select('*')` calls narrowed to only consumed columns.

#### Step 2.7 — TypeScript strictness sweep (14 files)
- `ROLLING_WINDOW_THRESHOLDS` narrowed `Record<number, ...>` → `Record<1 | 2 | 3, ...>`. `evaluateRollingWindow` now uses an explicit `if (level === 4) return early` typeguard before the lookup (level 4 has no upward advancement).
- `GroupStatus` narrowed from `'active' | 'paused' | 'archived'` to just `'active'`. Accompanying deletion: `toggle_invite` action removed from `app/api/groups/[id]/manage/route.ts` `ManageAction` union, validator allow-list, handler block, and doc comment (UI replaced it with `toggle_public` in Phase 9; backend was the last consumer of `'paused'`).
- 5 redundant `as PillarName` casts removed from `completion/page.tsx`, `HistoryWeekGrid` (×2), `HistoryProgressReport` (×2). The 6th in `lib/rolling-window.ts:93` is real (`Object.entries` widens keys to `string`) and stays.
- 3 `Object.fromEntries(...) as Record<…>` patterns tightened to `Partial<Record<PillarName, LevelNumber>>` (consumers already use `?? 1`); added `PillarName` import to `PillarPortrait` + `goals/page`.
- Dropped unused `userId` prop from `PillarCard` / `GroovingPillarCard` / `SoloingPillarCard` interfaces and from `DashboardShell`'s JSX passes for those three.
- Dropped unused `dayNumber` from `JammingPillarCard` interface — required splitting `DashboardShell`'s shared `CardComponent = level === 1 ? Tuning : Jamming` pattern into separate Tuning/Jamming/Grooving/Soloing branches (TS treats union-component props as intersection, so removing dayNumber from one half broke the shared call).
- Dropped unused `ChallengeDuration` import from `ChallengeDurationEditor`.
- `USERNAME_REGEX` exported from `lib/constants.ts` and imported in both `api/onboarding/username` and `api/settings/username` (replaces 2 local copies).
- `console.error` added for discarded `.error` fields on 6 parallel-fetch results in `goals/page.tsx` and `groups/page.tsx`.

#### Step 2.8 — Accessibility
- `GroupManageSheet` public/private toggle: `role="switch"` + `aria-checked={isPublic}` + `aria-label` ("Make group public/private").
- `GroupCard` check-in circles: `role="img"` + descriptive `aria-label` per member ("@user checked in today" / "@user has not checked in today").
- 5 `BottomNav` icon SVGs: `aria-hidden="true"` (label text already names the tab).
- `BottomNav` `<Link>` inline `style={{ color: isActive ? '#1e40af' : '#94a3b8' }}` swapped for conditional Tailwind (`text-blue-800` / `text-slate-400`); preserves `#1e40af` blue exactly. Line 74 `paddingBottom: max(env(safe-area-inset-bottom), 8px)` left inline as legitimate `env()` use.
- Tuning + Jamming dots: `role="img"` + `aria-label`. Jamming `DotRow` gained a `startIndex: number` prop (passed `0` for top row, `topRow.length` for bottom row) so the two rows announce Days 1–7 and Days 8–14 instead of both repeating Days 1–7.

#### Architectural rules established or reinforced by Tier 2
- **Username comparisons are case-insensitive but case-preserving.** `.ilike()` everywhere, never `.toLowerCase() + .eq()`. The DB uniqueness index is on `lower(username)` (post-Phase 9) — code paths must match.
- **`.ilike()` on user input must escape `% _ \`.** Otherwise the user controls the LIKE pattern. Use `.replace(/[%_\\]/g, '\\$&')`.
- **Resource ownership verified in the same query as the resource ID.** History challenges fetch was a hold-out; now matches the rule from Round 1 Tier 1.
- **Server components/API routes use `console.error` on discarded `.error` fields from parallel fetches.** Silent failures of secondary fetches (member counts, owner usernames) make `groups/page.tsx` look broken with no diagnostic trail.
- **Decorative interactive elements get `role="switch" / "img"` + `aria-label`.** A `<div>` styled like a circle is invisible to screen readers without the role + label.

#### Verification (pending user smoke tests in production)
Code committed locally (`b6a1b7b`); push by user via HTTPS+token. After Vercel deploys:
- Invite a mixed-case username (e.g. `@David1`) to a group → invitation sends and appears in the recipient's notifications
- Try to create a 6th group → 400 rejection inline in `CreateGroupModal`
- Search groups with `%` in the query → no enumeration of all groups; treated as a literal `%` character
- VoiceOver / TalkBack announces the public/private toggle as a switch with current state, and announces each pillar dot with its day number and status

---

### Post-Code-Review Round 2 — Tier 3 (DRY, performance, file splits)

Tier 3 shipped across 2 commits: Steps 3.1–3.6 as `7c4c942` on 2026-05-09 (43 files, +1456/−1410, 18 new files), and Step 3.7 as `2474beb` on 2026-05-11. No behavior changes throughout — pure refactor + perf.

#### Step 3.1 — `CheckinApiResponse` to `lib/types.ts`
Type interface moved from 3 pillar cards (Tuning, Jamming, Grooving) to `lib/types.ts`; consumers import via existing `import type` statement.

#### Step 3.2 — `ProgressRing` extracted
`components/dashboard/ProgressRing.tsx` (NEW). Props: `{ percentage, titleColor, subtitleColor, strokeColor? }`. `strokeColor` defaults to `#22c55e`. Replaces local `ProgressRing` + `CIRCUMFERENCE` const in `GroovingPillarCard` + `SoloingPillarCard` (~107 lines deduplicated).

#### Step 3.3 — `usePillarSave` hook extracted
`hooks/usePillarSave.ts` (NEW). Owns `/api/checkin` POST, `res.ok` guard, error/saving/saved/advancedToLevel state, `router.refresh()` (2.5s on advancement, immediate on normal save), 2s `saved` cleanup. Signature: `usePillarSave(pillar, challengeId, entryDate, onSuccess?)` — `onSuccess` callback fires on non-advancement success path so cards can `setIsOpen(false)`. Replaces `handleSave` + 3–4 useState lines + `useRouter` in all 5 pillar cards. ~170 lines deduplicated.

#### Step 3.4 — UI primitives extracted
`components/ui/ChevronIcon.tsx`, `PlayIcon.tsx`, `Spinner.tsx` (all NEW). Each accepts a `className` prop (default sizes baked in). The `direction: 'up' | 'down'` prop on ChevronIcon was rejected — callers already encode rotation via `${isOpen ? 'rotate-180' : ''}` on the parent class. Pillar-card chevrons changed from `fill="white"` → `fill="currentColor"` + `text-white` className (visual identical). Replaced 5 chevron SVGs (all 5 pillar cards), 3 play SVGs (Tuning/Jamming/Grooving), 9 spinner SVGs across 8 files (`AccountSection`, `CompletionScreen`, `GroupInvitePanel`, `OnboardingGoalsClient`, `ClarityVideosScreen`, `ProfileFlow`, `UsernameSetupScreen` ×2, `DurationPicker`). ~17 inline SVG blocks deduplicated.

#### Step 3.5 — 7 oversized files split
Each parent now under 200 lines; pure code-move with no behavior change.
- `CompletionScreen.tsx` (272 → 76 lines): extracted `PillarStatRow.tsx` (50 lines, owns `PillarStat` interface) + `RestartFlow.tsx` (156 lines, owns 4-step restart state machine + restart POST). Parent dropped `'use client'` (now pure presentational). `PillarStat` re-exported from CompletionScreen via `export type { PillarStat } from './PillarStatRow'` so `app/(app)/completion/page.tsx` import keeps working.
- `ChallengePauseTools.tsx` (277 → 47 lines): extracted `ActivePauseCard.tsx` (54 lines, Resume flow), `ImmediatePauseCard.tsx` (57 lines, Pause Now flow), `ScheduledPauseCard.tsx` (133 lines, owns BOTH schedule-new + cancel-existing flows since they share the parent prop and JSX branch). Parent dropped `'use client'`. `id="challenge-tools"` anchor preserved on parent so `LifePauseBanner`'s `/settings#challenge-tools` deep link still works.
- `HistoryProgressReport.tsx` (248 → 84 lines): extracted `ProgressChart.tsx` (118 lines, owns SVG geometry) + `PillarSummaryCard.tsx` (70 lines, owns stats card + `PillarStats` interface). Parent retains `'use client'` and data layer (entryIndex, goalsByPillar, getPillarPct) but emits raw `pillarPcts: Record<string, number[]>` instead of pre-formatted polyline strings — child computes geometry end-to-end.
- `GoalEditorCard.tsx` (241 → 191 lines): extracted `GoalList.tsx` (34 lines, pure presentational) + `GoalEditorHeader.tsx` (57 lines, avatar + label + level subtitle + active/dormant toggle).
- `GroupManageSheet.tsx` (259 → 152 lines): extracted `RenameGroupForm.tsx` (83 lines, owns `renaming`/`nameInput`/`loading`/`error` state) + `DeleteGroupConfirm.tsx` (72 lines, owns `confirmDelete`/`loading`/`error` state). Error UX shifted from single shared toast at top to per-control inline messages for rename + delete; toggle/leave failures still show at top.
- `HistoryWeekGrid.tsx` (232 → 187 lines): moved 5 pure helpers (`formatWeekRange`, `formatShortDate`, `getPillarPct`, `getAllPct`, `cellStyle`) to `lib/historyUtils.ts` (NEW, 53 lines). Component retains `DAYS_OF_WEEK` UI label + `@/lib/constants` imports.
- `GroupDiscoverModal.tsx` (228 → 188 lines): extracted `GroupResultRow.tsx` (40 lines, stateless presentational; exports `RequestState` type).

#### Step 3.6 — Performance Map indexing (9 sub-bullets)
- `HistoryWeekGrid.tsx`: `lib/historyUtils.ts` `getPillarPct` and `getAllPct` signatures changed from `entries: PillarDailyEntry[]` to `entryIndex: Map<string, PillarDailyEntry>` (key `${pillar}|${date}`); `goals: DurationGoal[]` to `goalsByPillar: Map<PillarName, DurationGoal[]>`. Component builds both Maps once at top of render. Folded `loggedDays` migration: `activePillarLevels.some(p => allEntries.some(...))` → `entryIndex.has(\`${p.pillar}|${date}\`)`.
- `HistoryMonthGrid.tsx`: local standalone `getAllPct` deleted; replaced with closure inside component body capturing `entryIndex: Map<string, PillarDailyEntry>` + `datesWithEntries: Set<string>` built once per render. Closure preserves original semantics (returns `null` when no entries OR no active goals).
- `TuningPillarCard.tsx`: module-level `buildDots` signature changed `windowEntries: PillarDailyEntry[]` → `entryByDate: Map<string, PillarDailyEntry>`. Component body builds `entryByDate` once. `stalledDays` filter loop converted to `entryByDate.get(date)`.
- `JammingPillarCard.tsx`: same pattern as Tuning. `DotRow` sub-component untouched.
- `DashboardShell.tsx`: 4 `useMemo` Maps replace `viewingDateEntries` + per-pillar `.filter()` / `.find()` calls in PILLAR_ORDER loop: `windowEntriesByPillar`, `goalsByPillar`, `destinationGoalsByPillar`, `viewingDateEntryByPillar` (single Map subsumes both consumers of the deleted `viewingDateEntries` array).
- `GroupCard.tsx`: `[...group.members].sort(...)` wrapped in `useMemo([group.members, currentUserId])`.
- `GroupDiscoverModal.tsx`: `groupedByOwner` reduce wrapped in `useMemo([results, isUsernameSearch])`.
- `GroupDiscoverModal.tsx`: spinner-stuck early-return fix — added `setSearching(false)` to BOTH early-return branches in `handleQueryChange` (both the `val.trim().length === 0 || === '@'` branch and the `effective.length === 0` branch). Bug repro: type "ab" → debounce armed → clear before 400ms → spinner stuck. `setSearching(false)` on first-ever keystroke is a no-op (React bails on identical state updates).
- `app/(app)/completion/page.tsx`: single-pass `totalCompleted` accumulator replaces second `pillarStats.reduce(...)` filter pass that re-filtered `allEntries` per active pillar. Math unchanged. Saves ~activePillars × allEntries scans per render (5 × ~450 = 2,250 scans for a 90-day, 5-pillar challenge). Chose accumulator over adding `completedEntries` field to `PillarStat` — keeps prop type passed to `CompletionScreen` / `PillarStatRow` clean.

#### Architectural rules established or reinforced by Tier 3

- **`useMemo` Maps keyed by an aggregation dimension are the canonical pattern for per-row server data**, not repeated `.filter()` / `.find()` calls in render loops. Set deps to the source array(s) only — don't include downstream-only state like `query`.
- **Side-effect functions in render handlers must reset all state they wrote.** The `setSearching(true)` → debounce → user-clears bug pattern (`searching` left `true` forever) applies to any debounced/optimistic flow.
- **Hook extraction trumps component-state duplication for non-trivial fetch flows.** `usePillarSave` consolidated 5 copies of `handleSave` + state + router refresh; future pillar-card variations don't re-derive the same shape.
- **File splits should preserve the parent's import surface.** Pattern: when extracting a sub-component or interface, re-export the type from the original location so consuming server components don't need their imports rewritten (e.g. `export type { PillarStat } from './PillarStatRow'` in `CompletionScreen.tsx`).
- **`'use client'` is removable when state moves to children.** After 3.5 splits, `CompletionScreen.tsx`, `ChallengePauseTools.tsx`, and `ProgressChart.tsx`'s parent flipped to pure presentational server components — children retain `'use client'`. Reduces JS bundle.

#### Step 3.7 — Pattern cleanup and shared utilities (6 sub-bullets)
- `app/(app)/completion/page.tsx`: `PILLAR_ORDER` imported from `@/lib/constants`; local copy + orphaned `PillarName` import dropped.
- `lib/rolling-window.ts`: two `@/lib/constants` import lines merged into one.
- `lib/constants.ts`: added `export const PULSE_THRESHOLDS = { smooth: 5, rough: 3 } as const`; `lib/pulse.ts` imports it and replaces magic 5/3 in `computePulseState`.
- `components/dashboard/DashboardHeader.tsx`: local `addDays` (5 lines) deleted; imported from `@/lib/constants` (identical impl).
- NEW `lib/supabaseUtils.ts:getActiveChallenge(userId, supabase)` — tagged discriminated union `{ ok: true; challenge } | { ok: false; error }`. Initial `{ challenge; error: null } | { challenge: null; error }` shape failed TS narrowing through `const { challenge } = result` destructuring (12 errors); switched to `ok` tag with `if (!result.ok) return ...` pattern. Used in `pause POST`, `resume POST`, `duration PATCH` only — `restart`, `complete`, `pause DELETE` only need profile lookup, not full challenge, so left untouched (Option A scope per user decision; plan's "5 routes" claim was inaccurate). ~15 lines × 3 routes deduplicated.
- `lib/historyUtils.ts`: added `computePillarCompletion(entry, goals)` primitive returning `number | null`; `getPillarPct` delegates to it (now 4 lines instead of 8). MonthGrid intentionally kept its flat-ratio formula — formulas remain different by design (WeekGrid: per-pillar average; MonthGrid: flat ratio across all goals). MonthGrid's local `getAllPct` closure not refactored — would have required iterating per-pillar to use the helper, changing the formula.

#### Step 3.8 — Verify and ship Tier 3
Final `npx tsc --noEmit` gate clean across all of Tier 3. Manual smoke verified by user in production (dashboard render, pillar save on today + past day, advancement toast, History Week/Month/Progress tabs, group cards with sorted members, pause/resume challenge, change duration via Settings). **Round 2 code-review remediation complete.**

*Note on file size: the verification check "no file in `components/` exceeds 200 lines" failed on 7 files — TuningPillarCard.tsx (257), JammingPillarCard.tsx (255), DashboardShell.tsx (227), GroovingPillarCard.tsx (216), AccountSection.tsx (206), GroupInvitePanel.tsx (205), DestinationGoalSection.tsx (205). Step 3.5 only addressed 7 specifically-named oversized files; these 7 were never in plan scope. Splitting them is deferred to a future cleanup pass. The 200-line guideline in CLAUDE.md remains aspirational, not strictly enforced.*

---

### 2026-05 Modifications (COMPLETE — commit `155fece`)

Four post-launch UX fixes shipped as one bundle from `2026-05_modifications.md`.

#### Item 1 — History weekly view "ALL" row totals fix

`lib/historyUtils.ts:getAllPct` previously averaged only pillars that had an entry that day, so missed pillars never pulled the score down (a day with 1 of 5 active pillars completed showed 100% in the ALL row instead of ~20%). Rewritten:

```ts
// New behavior — missed pillars count as 0% in the per-pillar average.
let hasAnyEntry = false
let sum = 0
let pillarsWithGoals = 0
for (const p of activePillars) {
  const goals = goalsByPillar.get(p.pillar) ?? []
  if (goals.length === 0) continue          // pillars with no active goals: skip
  pillarsWithGoals++
  const entry = entryIndex.get(`${p.pillar}|${date}`)
  if (entry) {
    hasAnyEntry = true
    const completed = goals.filter(g => entry.goal_completions?.[g.id] === true).length
    sum += (completed / goals.length) * 100
  }
  // else: contributes 0 to sum (the fix)
}
if (!hasAnyEntry || pillarsWithGoals === 0) return null
return Math.round(sum / pillarsWithGoals)
```

Days with zero entries still return `null` (cell renders empty, not as 0%). The week-summary "X days logged · avg Y%" line is unchanged in spec — it averages non-null ALL cells. MonthGrid and Progress view formulas are intentionally different and were not touched.

#### Item 2 — User-initiated end of challenge

The server-side auto-complete write in `app/(app)/dashboard/page.tsx` (when `effectiveDay > duration_days`) is removed. The dashboard now renders `components/completion/EndOfChallengeDecision.tsx` instead — a 4-option decision screen:

- **Continue** — extends the challenge via existing `PATCH /api/challenges/duration` (preset grid of CHALLENGE_DURATIONS > current, plus an "Add a Week" → `duration_days + 7` button). After save, `router.refresh()` returns the user to the normal dashboard.
- **Review previous days** — `<Link href="/history">`. Past-day editing is the explicit recovery path for "I forgot to enter yesterday."
- **Edit my goals** — `<Link href="/goals">`.
- **End and view summary** — POSTs `/api/challenges/complete`, then `router.push('/completion')`.

`dashboard/page.tsx` resolves `?date=<past>` BEFORE the decision branch and adds `const isViewingPastDay = viewingDate < today`. The decision-screen branch is gated on `!isViewingPastDay`, so clicking a past-day cell from `/history` always lands on editable pillar cards — even when the challenge is past duration:

```ts
const effectiveDay = getEffectiveChallengeDay(challenge, today)
const isViewingPastDay = viewingDate < today
if (effectiveDay > challenge.duration_days && !challenge.is_paused && !isViewingPastDay) {
  return <EndOfChallengeDecision ... />
}
```

`app/api/checkin/route.ts` gained a 403 guard: today saves are blocked when `effectiveDay > duration_days`. The challenge ownership query was extended to fetch `start_date`, `duration_days`, `paused_at`, `pause_days_used`, then `getEffectiveChallengeDay(challengeCheck, clientToday)` is computed inline. Retroactive saves (`entry_date < clientToday`) remain allowed — they never trigger advancement either.

#### Item 3 — Pillar card save illumination

`hooks/usePillarSave.ts` `saved` timeout shortened from 2000ms → 1200ms. The 5 pillar-card outer wrappers now apply a transient ring when `saved` is true:

```tsx
className={`rounded-xl overflow-hidden transition-all duration-300 ${
  saved && !advancedToLevel
    ? 'ring-4 ring-emerald-400 shadow-[0_0_32px_rgba(52,211,153,0.85)]'
    : 'shadow-sm'
}`}
```

Soloing and the generic PillarCard fallback use the same class minus the `&& !advancedToLevel` guard (Soloing doesn't advance). Emerald was chosen because white (initial pick) was invisible against the light page background; emerald reads against both white background and the dark pillar card backgrounds.

#### Item 4 — Full-screen advancement celebration

New `components/dashboard/AdvancementCelebrationModal.tsx`:

- Fixed full-screen overlay, semi-opaque dark backdrop, `z-50`.
- Center card painted from `PILLAR_CONFIG[pillar]` — background color, large pillar icon in a `saveButton`-colored circle, `title`/`subtitle` text colors.
- Headline: "You've advanced to {LEVEL_NAMES[newLevel]}".
- Stage-appropriate line from new `ADVANCEMENT_MESSAGES: Record<2|3|4, string>` in `lib/constants.ts`:
  - 2 (Jamming): "You're finding your rhythm."
  - 3 (Grooving): "You're in the groove now."
  - 4 (Soloing): "You've made this part of who you are."
- Continue button (pillar `saveButton` color) → `onDismiss`.
- Backdrop fade-in + card zoom-in via new `@keyframes fadeIn` / `zoomIn` in `app/globals.css` (Tailwind doesn't ship animation utilities by default in this project).

`usePillarSave` updated — the prior `setTimeout(() => router.refresh(), 2500)` on advancement is removed because a hard refresh during the modal would unmount it. The hook now exposes `dismissAdvancement()`:

```ts
function dismissAdvancement() {
  setAdvancedToLevel(null)
  router.refresh()
}
```

Tuning/Jamming/Grooving cards render the modal at the top of their JSX when `advancedToLevel !== null`, passing `onDismiss={dismissAdvancement}`. The old inline "You've advanced to …" toast (which used to replace the open-card content) was removed. SoloingPillarCard is untouched (level 4 doesn't advance).

#### Architectural rules established or reinforced

- **Server never auto-marks a challenge complete.** The decision screen is the only path; only `POST /api/challenges/complete` (called from the End button) writes `status='completed'`. The old `dashboard/page.tsx` auto-complete block is gone.
- **`/dashboard?date=<past>` must always render editable pillar cards.** The decision branch is gated on `!isViewingPastDay` for this reason. Any future "post-duration" gating must preserve this — the History → past-day editing flow depends on it.
- **`/api/checkin` accepts retroactive saves at any time, blocks today saves past duration.** The split is on `effectiveDate === clientToday`. Retroactive entries never advance (existing rule, unchanged).
- **`saved` ring color is emerald, not white.** White rings on the page background are invisible. Pattern: `ring-4 ring-emerald-400 shadow-[0_0_32px_rgba(52,211,153,0.85)] transition-all duration-300`. Reuse for any future transient-success visual.
- **`router.refresh()` is never fired on a `setTimeout` while a modal is mounted.** `usePillarSave` defers refresh to the user-driven dismiss callback. Same rule for any future modal-on-success flow.
- **Pillar cards that handle advancement must wire `dismissAdvancement` to the modal's `onDismiss`.** Forgetting this leaves the modal mounted indefinitely (and never refreshes to show the next-level card variant). Soloing skips this because it never advances.

#### Files changed

| File | Change |
|------|--------|
| `lib/historyUtils.ts` | `getAllPct` rewritten |
| `app/(app)/dashboard/page.tsx` | Decision-screen branch; `isViewingPastDay` fallthrough |
| `app/api/checkin/route.ts` | 403 guard for today saves past duration |
| `hooks/usePillarSave.ts` | 1200ms `saved` timeout; `dismissAdvancement()` exposed; auto-refresh on advancement removed |
| `lib/constants.ts` | `ADVANCEMENT_MESSAGES` added |
| `app/globals.css` | `fadeIn`/`zoomIn` keyframes + `.animate-fadeIn` / `.animate-zoomIn` utilities |
| `components/completion/EndOfChallengeDecision.tsx` | NEW |
| `components/dashboard/AdvancementCelebrationModal.tsx` | NEW |
| `components/dashboard/{Tuning,Jamming,Grooving}PillarCard.tsx` | Emerald ring class; in-card advancement toast removed; modal mounted at top of JSX; `dismissAdvancement` destructured |
| `components/dashboard/{Soloing,}PillarCard.tsx` | Emerald ring class only |
| `.gitignore` | Added `/.clerk/` to prevent Clerk dev keyless-mode artifacts from being committed |

---

### Future Additions

#### Destination Goal Types (Unscheduled)

Within destination goals, users will maintain a personal list of "types" for tracking activity variety — for example, a Physical destination goal of "Strength training 3x per week" could have types like "Upper Body", "Lower Body", "Full Body". On check-in, the user selects a type from their saved list.

**Open design questions to resolve before building:**
- Is a type selected per check-in instance, or is it a static property of the goal?
- Is the type list scoped per destination goal, or shared across all goals in a pillar?
- What is the storage model — a new `destination_goal_types` table, or a jsonb column?
- Does type history feed into any stats or reporting?
- Does the UI treatment differ per pillar?

Phase and step number to be assigned once design questions are resolved.

#### Apple Health Connectivity (Unscheduled)

Integration with Apple Health for automatic Physical and Nutritional pillar data. Deferred until the app is wrapped for iOS. No design decisions made.

---

*This file was last updated: 2026-05-16 — 2026-05 modifications shipped (commit `155fece`): history weekly ALL row formula corrected (missed pillars now count as 0%); end-of-challenge replaced server auto-complete with user-driven `EndOfChallengeDecision` screen (Continue / Review past days / Edit goals / End) + `/dashboard?date=<past>` fallthrough so retroactive editing remains available; pillar save illumination now emerald-400 ring + glow (white was invisible against light background); advancement celebration replaced 2.5s in-card toast with full-screen pillar-themed `AdvancementCelebrationModal`, `router.refresh()` deferred until user-driven dismiss. Earlier (2026-05-11): Round 2 code review remediation COMPLETE (CODE_REVIEW_PLAN2.md) — Tier 1 timezone hardening (741abff + b4ecb09), Tier 2 (b6a1b7b), Tier 3 (7c4c942 + 2474beb + 208f4bc docs). Two housekeeping commits (ea41ddc untracking .next/, e60ff2d untracking tsconfig.tsbuildinfo) cleared git status noise. Pause UI restored to Settings page after orphaned-component regression discovered. Ten Supabase migrations confirmed run. Username lowercase constraint dropped post-Phase 9; replaced with case-insensitive index. Seven `components/` files remain over 200 lines (TuningPillarCard, JammingPillarCard, DashboardShell, GroovingPillarCard, AccountSection, GroupInvitePanel, DestinationGoalSection) — out of plan scope, deferred. All video URLs pending recordings.*
