# CLAUDE.md — Working Instructions for Claude Code

Read this file at the start of every session along with PRODUCT.md. These are your operating rules for this codebase. Follow them consistently.

## Your First Step Every Session

1. Read PRODUCT.md — understand the product, philosophy, level system, and database schema
2. Read this file — understand how to work in this codebase
3. Ask David: "What are we building today?" — then confirm which Phase/Step from PRODUCT.md it maps to
4. Build only that one thing. Do not anticipate or add adjacent features unless asked.

---

## Project Identity

- App name: Daily Consistency Tracker
- Repo: Ddaddy2980/DailyTracker
- Owner: David / Altared Life, LLC
- Framework: Next.js 14 with App Router
- Language: TypeScript (strict — no `any` types)
- Styling: Tailwind CSS only — no inline styles, no CSS modules, no styled-components
- Auth: Clerk (`@clerk/nextjs` v7)
- Database: Supabase (`@supabase/supabase-js` v2)
- Hosting: Vercel

---

## Branch Rules

- Never commit directly to `main`
- All active development happens on branch: `v2-phase5`
- Create feature sub-branches off `v2-phase5` for each build step:
  e.g. `step-43-duration-goal-card`, `step-44-destination-modal`
- When David says "this is ready", merge the feature branch into `v2-phase5` — not into `main`
- Only merge `v2-phase5` into `main` when David explicitly says "ready to go live"
- `v2-rebuild` is retired — do not use it as a base for new work

---

## File and Folder Conventions

### Directory structure to maintain

```
/app
  /dashboard              — existing tracker (preserve, do not refactor unless asked)
  /onboarding             — Level 1 onboarding flow (new)
  /challenge              — active challenge view (new)
  /consistency-profile    — Consistency Profile assessment flow
  /profile                — Five-Pillar Dashboard
  /api                    — API routes
    /supabase             — Supabase helper routes if needed

/components
  /ui                 — reusable UI primitives (buttons, cards, inputs)
  /dashboard          — dashboard-specific components
  /onboarding         — onboarding-specific components
  /challenge          — challenge-specific components
  /shared             — components used across multiple features

/lib
  /supabase.ts        — Supabase client singleton
  /types.ts           — all TypeScript interfaces and types
  /constants.ts       — app-wide constants (level config, video metadata, pillar definitions)
  /utils.ts           — shared utility functions

/hooks
  /useUser.ts         — Clerk user + Supabase user_profile combined hook
  /useChallenge.ts    — active challenge state hook
  /useLevel.ts        — current level and unlock logic
```

### Naming conventions

- Components: PascalCase (`DailyCheckIn.tsx`, `OnboardingWelcome.tsx`)
- Hooks: camelCase starting with `use` (`useChallenge.ts`)
- Utilities and lib files: camelCase (`supabase.ts`, `utils.ts`)
- Routes (folders): lowercase with hyphens (`/onboarding`, `/challenge`)
- Database functions: snake_case matching Supabase column names
- Constants: SCREAMING_SNAKE_CASE for true constants (`MAX_LEVEL`, `PILLAR_NAMES`)

---

## TypeScript Rules

- No `any` types — ever. Use `unknown` and narrow it, or define a proper interface.
- All Supabase responses must be typed. Define interfaces in `/lib/types.ts`.
- All component props must have defined interfaces.
- Use `type` for unions and primitives, `interface` for objects and component props.

### Required types to define in `/lib/types.ts`

```ts
interface UserProfile {
  id: string
  user_id: string
  current_level: number
  onboarding_completed: boolean
  purpose_statement: string | null
  selected_pillars: string[]
  accountability_user_id: string | null
}

interface Challenge {
  id: string
  user_id: string
  level: number
  duration_days: number
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'abandoned'
  pillar_goals: Record<string, unknown>
  days_completed: number
  consistency_pct: number
}

interface Reward {
  id: string
  user_id: string
  reward_type: RewardType
  challenge_id: string | null
  earned_at: string
}

type RewardType =
  | 'tuning_badge'
  | 'day1_complete'
  | 'day3_survival'
  | 'halfway'
  | 'day7_complete'
  | 'jamming_badge'
  | 'grooving_badge'
  | 'soloing_badge'
  | 'orchestrating_badge'

type PillarName = 'spiritual' | 'physical' | 'nutritional' | 'personal' | 'relational'

type LevelName = 'Tuning' | 'Jamming' | 'Grooving' | 'Soloing' | 'Orchestrating'
```

---

## Supabase Rules

### Client setup

- Supabase client lives in `/lib/supabase.ts` — import from there, never re-initialize
- Use the Supabase server client for server components and API routes
- Use the Supabase browser client for client components

### Always use `user_id` from Clerk

- The `user_id` field in all Supabase tables stores the Clerk user ID (`userId` from `useUser()` or `auth()`)
- Never use Supabase auth — Clerk handles all authentication
- Always filter queries by `user_id` — never fetch all rows

### Query pattern

```ts
// Always handle errors explicitly
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId)
  .single()

if (error) {
  console.error('Description of what failed:', error)
  return null // or throw, depending on context
}
```

### Row Level Security

- RLS is enabled on all tables
- Policy: users can only read/write their own rows
- Never expose the service role key to the client

---

## Clerk Rules

- Use `useUser()` hook in client components
- Use `auth()` from `@clerk/nextjs/server` in server components and API routes
- The Clerk `userId` is the `user_id` stored in all Supabase tables
- Protect all app routes with Clerk middleware — unauthenticated users redirect to sign-in
- The `/onboarding` route is accessible to authenticated users but should check `onboarding_completed` state

---

## Level Routing Logic

Every authenticated user session must resolve their level state:

```
User logs in
  → Check user_profile table for this user_id
  → If no user_profile row exists: create one (level=1, onboarding_completed=false) → redirect to /onboarding
  → If user_profile.onboarding_completed = false: redirect to /onboarding
  → If user_profile.current_level = 1: route to Tuning dashboard (/challenge or /dashboard)
  → If user_profile.current_level > 1: route to appropriate level dashboard
```

This routing logic belongs in the root layout or a middleware check — not scattered across pages.

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

---

## Gamification Rules

- Reward logic runs server-side (API route) after each check-in is saved
- Never award rewards on the client — always confirm via API response
- Reward types are defined in the `RewardType` union in `/lib/types.ts`
- Day 7 celebration is a full sequence: video unlock + badge award + shareable card + Scripture card
- The shareable card is a static image generated from a template (implement later — placeholder for now)

---

## Component Rules

- Every component is a single-responsibility unit — no component does more than one job
- No component file exceeds 200 lines — split if approaching that limit
- Client components (`'use client'`) only when state or browser APIs are needed
- Prefer server components by default
- No prop drilling beyond 2 levels — use context or hooks for shared state
- Loading states: every data-fetching component must handle loading and error states

---

## Tailwind Rules

- Use Tailwind utility classes only — no custom CSS files except `globals.css`
- Responsive design is required — mobile-first (`sm:`, `md:`, `lg:` breakpoints)
- Color palette: use Tailwind's built-in slate, emerald, amber, purple colors

**Pillar color constants and icon paths** should be defined in `/lib/constants.ts`
as a `PILLAR_CONFIG` object so components import from a single source rather than
repeating hex values inline. The required structure is:
```ts
export const PILLAR_CONFIG = {
  spiritual: {
    background: '#275578',
    title: '#82B2DE',
    subtitle: '#608BAF',
    saveButton: '#376891',
    icon: '/spiritual_icon.png',
    label: 'Spiritual',
  },
  physical: {
    background: '#202644',
    title: '#8A96CD',
    subtitle: '#656E96',
    saveButton: '#2C345B',
    icon: '/physical_icon.png',
    label: 'Physical',
  },
  nutritional: {
    background: '#B85D27',
    title: '#F7B188',
    subtitle: '#D19675',
    saveButton: '#CC6930',
    icon: '/nutritional_icon.png',
    label: 'Nutritional',
  },
  personal: {
    background: '#2E5144',
    title: '#96CE95',
    subtitle: '#77A676',
    saveButton: '#3B6051',
    icon: '/personal_icon.png',
    label: 'Personal',
  },
  relational: {
    background: '#317C80',
    title: '#82C7CB',
    subtitle: '#6AA2A6',
    saveButton: '#3F9297',
    icon: '/relational_icon.png',
    label: 'Relational',
  },
} as const
```

**Pillar hex values — use for all card UI:**

The authoritative pillar colors are defined in PRODUCT.md under Visual Design System. For pillar card backgrounds, titles, subtitle text, and save buttons always use Tailwind arbitrary value syntax with the exact hex codes (e.g. bg-[#275578], text-[#82B2DE]). Do not use Tailwind's named color classes (e.g. bg-purple-600) for any pillar card UI element — those are for general UI only, not for pillar cards.

**Global app background:**

The app background is `#EBEBEC`. Apply via bg-[#EBEBEC] on the root layout. Do not use bg-gray-100 or any other Tailwind gray approximation.

**Icons:**
Always use Next.js <Image> component for pillar icons and the app logo. Icons live in `/public` — reference them as `/spiritual_icon.png`, `/logo_2.png`, `/physical_icon.png`, `/nutritional_icon.png`, `/personal_icon.png`, `/relational_icon.png`. Never use emoji or placeholder text in place of an icon once the icon files are confirmed present.

---

## Data Shape Invariants

These are confirmed facts about the database state. Do not write code that hedges against the old format.

- **`user_profile.focus_top_5`** is always `FocusTop5Item[] | null` — never a plain `string[]`. The string array format never existed in production. Any code reading this field must handle the structured `{ rank, text }` format only.

---

## What Not To Touch

Unless David explicitly asks:

- Do not refactor the existing `/app/dashboard` route or its components
- Do not modify existing Supabase table structures (`daily_entries`, `user_config`, `user_goals`, `weekly_notes`)
- Do not change the Clerk configuration
- Do not change `package.json` dependencies without asking first
- Do not rename existing files or folders
- Do not modify `checkRootedMilestone()` in `/lib/milestones.ts` without David's explicit direction — this function has been fully tested against 8 scenarios including a regression test for the carried-forward goal fix
- Do not modify the `createDestinationGoal` upsert logic or the `rooted_badge` wiring in `submitCheckin` without David's explicit direction
- Do not modify `checkRootedMilestone()` in `/lib/milestones.ts` without David's explicit direction — this function has been fully tested against 8 scenarios including a regression test for the carried-forward goal fix
- Do not change the `late_rescue` cron schedule in `vercel.json` without first confirming the correct UTC offset. Current value is `45 1 * * *` — this is a known error. Correct value is `45 3 * * *` (9:45 PM CST = 03:45 UTC). Fix before go-live.
---

## Known Deferred Items

- `?addPillar` query param — written by `TuningComplete` and `JammingComplete` on Next Pillar Invitation accept. Jamming and Grooving onboarding flows do not yet consume it. When wired, the onboarding flow must pre-select the invited pillar for goal setup rather than presenting a cold start.
- `GroovingCompletionScreen` — Next Pillar Invitation step not yet wired. Safe to defer because `INVITATION_THRESHOLDS[3]` is undefined and the DB field is never written for level-3 users until that threshold is defined.
- Monthly Pillar Check — stagnation fallback not yet implemented. If `resolveNextPillarInvitation` returns null (no Dormant pillar, no gap), no monthly pillar question is shown. A future step may add a stagnation check targeting the lowest gauge-score pillar when no gap or Dormant pillar exists.
- Jamming cron morning tone adaptation — the Level 2 cron morning block still sends a static `JAMMING_NOTIFICATIONS` message regardless of pillar state. Adaptive tone for Level 2 is deferred to a future step.

---

## How To Handle Uncertainty

- If a task is ambiguous, ask one clarifying question before writing code — not five
- If two approaches are reasonable, briefly state both and ask David which to use
- If you realize mid-task that the approach will require touching something in the "do not touch" list, stop and ask before proceeding
- Never silently make architectural decisions — surface them

---

## Session End Protocol

At the end of each session:

1. Summarize what was built in 2–3 sentences
2. State what was tested and confirmed working
3. State the recommended next step (which Phase/Step from PRODUCT.md)
4. Flag any decisions that were made that David should be aware of

---

## Known Deferred Items

- `?addPillar` query param — written by `TuningComplete` and `JammingComplete` on Next Pillar Invitation accept. Jamming and Grooving onboarding flows do not yet consume it. When wired, the onboarding flow must pre-select the invited pillar for goal setup rather than presenting a cold start.
- `GroovingCompletionScreen` — Next Pillar Invitation Step not yet wired. Safe to defer because `INVITATION_THRESHOLDS[3]` is undefined and the DB field is never written for level-3 users until that threshold is defined.
- Monthly Pillar Check stagnation variant — `resolveNextPillarInvitation()` returns `null` when all active pillars are at the same level (no gap, none dormant), so the monthly check is skipped. A future step may introduce a stagnation check that targets the lowest gauge-score pillar in this scenario. Do not implement until David explicitly requests it.

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

### Phase 5 — Destination Goals (CURRENT)

- [ ] Step 43 — Pillar card expand/collapse + destination goal display: Build open/closed card interaction. Closed state shows duration goal count. Open state shows duration goal checkboxes, destination goal checkboxes (if any active), and Save button. Query duration_goal_destinations for active goals by pillar. No setup flow in this step.
- [ ] Step 44 — Destination goal setup flow: Add/edit/release destination goals from Goals tab. Three input fields: goal name, frequency target, time window. Confirmation screen. Writes to duration_goal_destinations.
- [ ] Step 45 — Weekly reflection update: Add destination goal progress to weekly reflection. Duration performance shown first and prominently. Destination hits vs. target shown below as personal record. Writes to weekly_reflections.destination_goal_statuses.
- [ ] Step 46 — Expiry and completion logic: Detect window end, handle Completed / Released / Expired states, update status field, surface prompt in weekly reflection or pillar card.
- [ ] Step 47 — G6b video card: Trigger "Setting a direction within your daily habit" video when user first adds a destination goal from the Goals tab. One-time trigger per user.
- [ ] Step 48 — Destination goal expiry notification: Embedded in weekly reflection when end date is within 7 days. Not a standalone push notification.

### Phase 6 — Soloing Level (FUTURE)

### Phase 7 — Orchestrating Level (FUTURE)

---

*This file was last updated: April 2026 — Phase 4 complete, Phase 5 active*
*Do not modify this file without David's direction*
