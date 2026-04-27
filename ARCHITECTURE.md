# ARCHITECTURE.md — System Architecture & Build History

This file contains architecture decisions and the full build sequence log.
Reference it when working on routing, video, notifications, or reviewing 
completed phases. Do not modify completed phase entries.

---

> **v3 is live on `main`, deployed to `altared-tracker.com`.** All v2 phases and the
> `v3-phase1` branch are retired. Do not use them as a base for new work.
> The v3 schema is defined in `supabase/migrations/20260410000000_v3_clean_schema.sql`.

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
- [x] Step 16b — Life Pause feature: `20260410000005_challenge_pause.sql` (6 new columns on `challenges`); `getEffectiveChallengeDay()` in `lib/constants.ts`; `Challenge` interface updated; `/api/challenges/pause` (POST immediate/scheduled, DELETE cancel); `/api/challenges/resume` (POST, accumulates pause_days_used); `/api/checkin` 403 guard when paused; `dashboard/page.tsx` auto-activates scheduled pauses on load + uses effective day; `PausedDashboard` component (freeze view + Resume button); `LifePauseBanner` (taking_on_water trigger, dismissible, one-tap pause or schedule link); `DashboardHeader` gets isPaused prop (amber badge + bar); `DashboardShell` renders paused/banner states; `ChallengePauseTools` component on Goals page (immediate pause form, scheduled pause form, cancel, resume)

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

*This file was last updated: April 2026 — Code review & remediation complete (Tiers 1–4). Timezone fix complete. v3 live on main. Ten Supabase migrations confirmed run. Username lowercase constraint dropped post-Phase 9; replaced with case-insensitive index. All video URLs pending recordings.*
