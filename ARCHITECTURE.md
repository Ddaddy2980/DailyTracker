# ARCHITECTURE.md — System Architecture & Build History

This file contains architecture decisions and the full build sequence log.
Reference it when working on routing, video, notifications, or reviewing 
completed phases. Do not modify completed phase entries.

---

> **v3 rebuild is active on branch `v3-phase1`.** All v2 phases below are
> retired. Do not use v2 routes, tables, or logic as a base for new work.
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
1. challenge_duration_selected  → /onboarding/duration
2. clarity_videos_seen          → /onboarding/videos
3. consistency_profile_completed → /onboarding/profile
4. goals_setup_completed        → /onboarding/goals
5. onboarding_completed         → /dashboard
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

### Phase 5 — Groups

Groups requires a new Supabase migration. Three new tables: `consistency_groups`, `group_members`, `group_daily_status`.

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

#### Build Steps

- [ ] Step 13 — Groups DB migration: `20260410000002_v3_groups.sql`; run in Supabase SQL Editor
- [ ] Step 14 — Groups API + UI: all routes + components listed above; `GroupView`, `GroupCard`, `CreateGroupModal`, `JoinGroupModal`, `GroupManageSheet`; `/app/join/[inviteCode]/page.tsx`; daily status sync in `/api/checkin/`

### Phase 6 — Clarity Videos & Coaching (FUTURE)

- [ ] Step 15 — Clarity video screen: `video_progress` table migration (or boolean flags on `user_profile`); gate "Continue" button by all three videos marked watched; populate URLs when recordings are ready
- [ ] Step 16 — Per-level coaching video cards: level-specific encouragement video triggers inside pillar cards (e.g., stall detection at Tuning); `VideoLibraryTab` rebuilt for v3

### Phase 7 — Challenge Completion & Restart (FUTURE)

- [ ] Step 17 — Challenge completion screen: detect when `today > start_date + duration_days`; show stats (days completed, per-pillar %) and restart / continue options
- [ ] Step 18 — Challenge restart: new challenge row with optional Consistency Profile retake; pillar levels carry forward

---

*This file was last updated: April 2026 — v3 Phase 4 complete (Step 12). Phase 5 Groups is next (Steps 13–14). Full rebuild roadmap set through Phase 7. v2 code removed from branch.*
