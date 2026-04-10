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

## The Build Sequence (Reference)

Build in this order. Do not skip ahead.

### Phase 1 — Tuning Level (COMPLETE)

- [x] Step 1 — Database migration: add all new v2 tables to Supabase
- [x] Step 2 — Level routing logic: user_profile check and level-based redirect on login
- [x] Step 3 — Onboarding flow: 5-screen pre-challenge experience
- [x] Step 4 — Tuning dashboard: 7-day challenge view with gamification
- [x] Step 5 — Video coaching system: video cards triggered by day and event
- [x] Step 6 — Gamification: rewards, badges, streak visual, Day 7 celebration sequence
- [x] Step 7 — Migrate existing tracker: wrap /app/dashboard inside new level-aware shell

### Phase 2 — Jamming Level (COMPLETE)

- [x] Step 8 — Database migration: add pulse_checks table + new user_profile fields
- [x] Step 9 — Tuning completion + transition screen: celebration, share card, rest day option, Jamming invitation
- [x] Step 10 — Jamming onboarding: 3-screen lighter onboarding, carry-forward goal, accountability partner setup
- [x] Step 11 — Pulse check UI: three-state question component, weekly anchor display, cooldown logic
- [x] Step 12 — Pulse check engine: event trigger detection (missed day, partial completion), 48-hour cooldown enforcement, notification_tier update
- [x] Step 13 — Adaptive notification system: notification_tier drives cadence, mid-week message, accountability partner weekly update
- [x] Step 14 — Jamming dashboard: 14/21-day challenge map, named milestones, weekly summary view, pulse history
- [x] Step 15 — Jamming video additions: J1–J7 video cards with pulse-state triggers
- [x] Step 16 — Jamming completion sequence: badge, stats, share card, Grooving invitation

### Phase 2.5 — Consistency Groups (Cross-Level Feature)

This feature is available at all levels from Tuning onward. It is built here because its group_daily_status write must be wired into submitCheckin, which is touched again in Grooving. Build it once in the right place.

- [x] Step 16a — Database migration: add consistency_groups, group_members, group_daily_status tables
- [x] Step 16b — Group creation flow: name input, invite code generation, creator management screen
- [x] Step 16c — Group join flow: code entry screen, deep-link URL handler (/join/[inviteCode]), join confirmation
- [x] Step 16d — Group dashboard: member list with pillar dots, completion indicators, streak counts, grace period logic
- [x] Step 16e — submitCheckin integration: write/upsert group_daily_status for all active groups on every check-in
- [x] Step 16f — Group management: rename, remove member, leave group, archive/delete group
- [x] Step 16g — Group notifications: member joined (pending_join_notification), full-group-day celebration flag (group_daily_flags)
- [x] Step 16h — Multi-group support: selector UI when user belongs to more than one group

### Phase 3 — Grooving Level (COMPLETE)

- [x] Step 17 — Database migration: add grooving_circle_members, destination_goals, weekly_reflections, challenge_pauses tables + new user_profile fields
- [x] Step 18 — Jamming completion + Grooving transition: "What changed?" reflection, Grooving invitation, challenge length choice
- [x] Step 19 — Grooving onboarding: 3-screen flow, 25/5 exercise, Grooving Circle setup
- [x] Step 20 — Full four-pillar access: unlock all four pillars at Grooving level, third/fourth pillar introduction flow
- [x] Step 21 — Habit calendar: grid view, color-coded by pillar, pattern detection, weekly summary link
- [x] Step 22 — Rooted milestone engine: Day 40–50 detection logic, celebration sequence, destination goal introduction bridge
- [x] Step 23 — Destination goal system: setup flow, dashboard layer above duration goals, weekly check-in integration
- [x] Step 24 — 25/5 focus exercise: full exercise UI, save top 5 to user_profile, link to destination goals
- [x] Step 25 — Deeper weekly reflection: rotating questions, full reflection flow, destination goal check-in, pulse check integration
- [x] Step 26 — Grooving Circle: member management, weekly digest generation, encouragement reply system
- [x] Step 27 — Life interruption pause system: pause activation, streak preservation, end date extension, return flow
- [x] Step 28 — Grooving video additions: G1–G8, G-Return, pulse response variants
- [x] Step 29 — Grooving notification system: reduced cadence, habit calendar pattern alerts, Rooted milestone push
- [x] Step 30 — Grooving completion sequence: badge, full stats, 25/5 review, destination goal status, Soloing invitation

### Phase 4 — Pillar Architecture & Consistency Profile (COMPLETE)

This phase restructures the app's core model from a single-ladder system to a per-pillar level architecture. Every new user enters through the Consistency Profile. The Unified Challenge Container governs all active pillars simultaneously.

- [x] Step 31 — Database migration: create pillar_levels table (includes gauge_score column), consistency_profile_sessions table (includes relational_score column alongside the four existing pillar score columns), duration_goal_destinations table. Add new columns to user_profile (consistency_profile_completed, life_on_purpose_score, next_pillar_invitation_pillar, last_pillar_check_at) and challenges (pillar_level_snapshot). Add destination_goal_statuses column to weekly_reflections
- [x] Step 32 — Pillar operating state logic: build /lib/pillar-state.ts. Function takes a user's pillar_levels rows and returns the operating state for each pillar (Anchored / Developing / Building / Dormant). Used at challenge start and in dashboard rendering.
- [x] Step 33 — Consistency Profile flow: build /app/consistency-profile. 20-question assessment (5 pillars × 4 questions), one pillar at a time in order: Spiritual → Physical → Nutritional → Personal → Relational. Score each pillar 0–12. Write results to consistency_profile_sessions and seed pillar_levels table with one row per pillar. Set consistency_profile_completed = true on user_profile.
- [x] Step 34 — Pillar Portrait screen: post-Profile output screen. Display all five pillars with starting level name and status phrase. Personalized statement honoring strong pillars. Development focus identification. Single agency question. Save focus selection to consistency_profile_sessions.focus_pillar_selected.
- [x] Step 35 — Routing update: update root layout / middleware to route new users to /consistency-profile instead of directly to /onboarding. After Profile completion, route to appropriate onboarding based on lowest-level active pillar.
- [x] Step 36 — Unified Challenge Container: update challenge creation logic to snapshot all active pillar levels and operating states into challenges.pillar_level_snapshot at challenge start. Challenge duration is determined by highest-development pillar level.
- [x] Step 37 — Adapted daily check-in: update check-in component to render pillar cards based on operating state. Anchored → compact muted card. Developing → full card. Building → prominent gamified card. Dormant → not shown.
- [x] Step 38 — Five-Pillar Dashboard: build /app/profile. Each pillar card displays its level name, operating state, and Consistency Gauge. Dormant pillars shown in muted state with quiet invitation. Life on Purpose Score shown only when all five pillars are active.
- [x] Step 39 — Consistency Gauge engine: build the per-pillar gauge calculation logic. Each pillar gauge combines weekly duration goal consistency performance and a rolling weighted average of historical weekly performance. Gauge recalculates weekly. Persist current gauge score per pillar to pillar_levels.gauge_score. Life on Purpose Score is the simple average of all five pillar gauge scores, persisted to user_profile.life_on_purpose_score.
- [x] Step 40 — Next Pillar Invitation: build post-challenge invitation logic. Fires when any pillar is Dormant or two or more levels below the user's highest. Clears next_pillar_invitation_pillar after user responds.
- [x] Step 41 — Monthly Pillar Check: add conditional pillar question to weekly reflection flow. Enforces 30-day cadence via last_pillar_check_at. Targets most underdeveloped or Dormant pillar.
- [x] Step 42 — Adaptive morning notification: update notification content to adapt tone based on pillar mix (Building present → motivational, all Developing → coaching, all Anchored → reflective).

### Phase 5 — Destination Goals (COMPLETE)

- [x] Step 43 — Pillar card expand/collapse + destination goal display: Build open/closed card interaction. Closed state shows duration goal count. Open state shows duration goal checkboxes, destination goal checkboxes (if any active), and Save button. Query duration_goal_destinations for active goals by pillar. No setup flow in this step.
- [x] Step 44 — Destination goal setup flow: Add/edit/release destination goals from Goals tab. Three input fields: goal name, frequency target, time window. Confirmation screen. Writes to duration_goal_destinations.
- [x] Step 45 — Weekly reflection update: Add destination goal progress to weekly reflection. Duration performance shown first and prominently. Destination hits vs. target shown below as personal record. Writes to weekly_reflections.destination_goal_statuses.
- [x] Step 46 — Expiry and completion logic: Detect window end, handle Completed / Released / Expired states, update status field, surface prompt in weekly reflection or pillar card.
- [x] Step 47 — G6b video card: Trigger "Setting a direction within your daily habit" video when user first adds a destination goal from the Goals tab. One-time trigger per user.
- [x] Step 48 — Destination goal expiry notification: Embedded in weekly reflection when end date is within 7 days. Not a standalone push notification.

### Phase 6 — Soloing Level (COMPLETE)

- [x] Step 49 — Grooving → Soloing transition: restructure GroovingCompletionScreen into 4-phase stepped flow (reflection, per-pillar celebration, Soloing invitation, non-eligible summary). Wired INVITATION_THRESHOLDS[3] = { windowDays: 30, minCompletions: 22 }. Fixed submitCheckin to write pillar_levels.level = 4 and operating_state = 'anchored' atomically with user_profile.current_level = 4. Fixed computeAndWriteNextPillarInvitation to fetch rolling window dynamically from thresholdConfig.windowDays.
- [x] Step 50 — Soloing onboarding flow: 3-screen flow (identity, what changes, duration picker — 90 or 100 days). Challenge creation with correct duration. Re-fire gate: if any pillar_levels row already at level ≥ 4 with active challenge, skip onboarding and route to /soloing.
- [x] Step 51 — Soloing dashboard: /soloing route, SoloingDash, SoloingHeader (violet, 🎻 at 21+ streak), SoloingWeeklyReflectionFlow (10-question stewardship pool, no pulse step). Grooving Circle absent. Consistency Groups tab retained. /grooving/page.tsx redirects level-4 active challenges to /soloing.
- [x] Step 52 — Destination goals unlimited: removed 3-goal cap for Soloing pillars (pillarLevel >= 4). Expanded window ceiling to 100 days for Soloing pillars. Cap condition now explicit in DestinationGoalSection.tsx with named constants. No schema changes required.
- [x] Step 53 — Orchestrating transition wiring: INVITATION_THRESHOLDS[4] = { windowDays: 30, minCompletions: 24 } (80% matching Soloing advancement bar). SoloingCompletionScreen built as 4-phase stepped flow mirroring GroovingCompletionScreen. Ceiling Conversation fires when all five pillar_levels rows ≥ level 4. Orchestrating CTA replaced with static acknowledgment card until Phase 7 ships /orchestrating/onboarding.
- [x] Step 54 — Soloing video cards: S1–S7 defined (all url: '' placeholder assets). VideoLibraryTab extended to level 4 with cumulative module access ['A','B','C','D','J','G','S']. SoloingVideoSection wired for inline today-tab cards (S1 on Day 1, S6 on streak-break after 21+ days). S module color: indigo. calcStreakBrokenAfter21 helper in app/soloing/page.tsx.
- [x] Step 55 — Soloing notification system: SOLOING_NOTIFICATIONS added to lib/constants.ts. Morning block added to cron route for level-4 users. Reuses resolveMorningTone() without modification. Milestone notifications stack on Day 30, 60, 90. No evening, no mid-week (consistent with Grooving). late_rescue cron bug fixed: was 45 1 * * * (8:45 PM CST), now 45 3 * * * (9:45 PM CST).
- [x] Step 56 — Soloing completion sequence: full summary phase built — 4-stat grid (days, consistency %, longest streak, goals reached), violet CalendarGrid, share card, interactive destination goal reached/released/skip picker (mirrors Grooving pattern), go-again duration picker (90 or 100 days). startSoloingAgain updated to accept optional overrideDurationDays. calcLongestStreak helper in app/soloing/page.tsx.


### Phase 7 — Orchestrating Level (FUTURE)

---

*This file was last updated: April 2026 — Phase 6 complete, deployed to main. Alpha testing in progress. Phase 7 planning next.*
