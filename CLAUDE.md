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
- All v2 work happens on branch: `v2-rebuild`
- Create feature sub-branches off `v2-rebuild` for each build step:
  e.g. `v2-rebuild/database-migration`, `v2-rebuild/onboarding-flow`
- When David says "this is ready", merge the feature branch into `v2-rebuild` — not into `main`
- Only merge `v2-rebuild` into `main` when David explicitly says "ready to go live"

---

## File and Folder Conventions

### Directory structure to maintain

```
/app
  /dashboard          — existing tracker (preserve, do not refactor unless asked)
  /onboarding         — Level 1 onboarding flow (new)
  /challenge          — active challenge view (new)
  /api                — API routes
    /supabase         — Supabase helper routes if needed

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
  | 'starter_badge'
  | 'day1_complete'
  | 'day3_survival'
  | 'halfway'
  | 'day7_complete'
  | 'builder_badge'
  | 'consistent_badge'
  | 'refiner_badge'
  | 'guide_badge'

type PillarName = 'spiritual' | 'physical' | 'nutritional' | 'personal'

type LevelName = 'Starter' | 'Builder' | 'Consistent' | 'Refiner' | 'Guide'
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
  → If user_profile.current_level = 1: route to Starter dashboard (/challenge or /dashboard)
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
- Pillar color associations (use consistently):
  - Spiritual: `purple-*`
  - Physical: `emerald-*`
  - Nutritional: `amber-*`
  - Personal: `blue-*`

---

## What Not To Touch

Unless David explicitly asks:

- Do not refactor the existing `/app/dashboard` route or its components
- Do not modify existing Supabase table structures (`daily_entries`, `user_config`, `user_goals`, `weekly_notes`)
- Do not change the Clerk configuration
- Do not change `package.json` dependencies without asking first
- Do not rename existing files or folders

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

## The Build Sequence (Reference)

Build in this order. Do not skip ahead.

- [ ] Step 1 — Database migration: add all new v2 tables to Supabase
- [ ] Step 2 — Level routing logic: user_profile check and level-based redirect on login
- [ ] Step 3 — Onboarding flow: 5-screen pre-challenge experience
- [ ] Step 4 — Starter dashboard: 7-day challenge view with gamification
- [ ] Step 5 — Video coaching system: video cards triggered by day and event
- [ ] Step 6 — Gamification: rewards, badges, streak visual, Day 7 celebration sequence
- [ ] Step 7 — Migrate existing tracker: wrap /app/dashboard inside new level-aware shell

---

*This file was last updated: March 2026*
*Do not modify this file without David's direction*
