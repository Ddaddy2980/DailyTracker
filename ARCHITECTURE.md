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

### Phase 2 — Pillar Cards & Advancement Engine (NEXT)

- [ ] Step 5 — Tuning pillar card: 7-day rolling window dot visualization (last 7 days shown as filled/empty dots below the goal checkbox). Dots computed from `pillar_daily_entries` filtered to last 7 calendar days. Replace generic PillarCard with level-aware routing in DashboardShell.
- [ ] Step 6 — Jamming pillar card: 14-day dot visualization (2 rows of 7). Same data source, different window. Enforce 2-goal cap display. Level name badge changes to "Jamming".
- [ ] Step 7 — Grooving pillar card: 3-goal display, destination goal layer (read from `destination_goals` where `status = 'active'`). No dot visualization at Grooving (window too large). Level badge "Grooving".
- [ ] Step 8 — Soloing pillar card: 4-goal display, unlimited destination goals, identity framing header ("You've made this part of who you are"). Level badge "Soloing".
- [ ] Step 9 — Rolling window advancement engine: after every `/api/checkin` save, run `evaluateRollingWindow` for that pillar; if `shouldAdvance`, write new level to `pillar_levels`, return `{ advanced: true, newLevel }` in API response; `PillarCard` shows advancement toast/animation on response.

### Phase 3 — Goal Management (FUTURE)

- [ ] Step 10 — Mid-challenge goal editing: add/remove duration goals within cap per pillar level; goal edit UI accessible from expanded pillar card; writes to `duration_goals` (soft-delete via `is_active = false`)
- [ ] Step 11 — Destination goal setup and management: add/edit/release destination goals (Grooving+); goal cap enforced per level; writes to `destination_goals`

### Phase 4 — Clarity Videos & Coaching (FUTURE)

- [ ] Step 12 — Clarity video screen: three placeholder video cards on onboarding videos step; video state persistence in a new `video_progress` table (or boolean flags on `user_profile`)
- [ ] Step 13 — Per-level coaching video cards: level-specific encouragement video triggers inside pillar cards (e.g., stall detection at Tuning)

### Phase 5 — Challenge Completion & Restart (FUTURE)

- [ ] Step 14 — Challenge completion screen: detect when `today > start_date + duration_days`; show stats (days completed, per-pillar %) and restart / continue options
- [ ] Step 15 — Challenge restart: new challenge row with optional Consistency Profile retake; pillar levels carry forward

---

*This file was last updated: April 2026 — v3 Phase 1 complete. Phase 2 is next.*
