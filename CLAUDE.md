# CLAUDE.md — Working Instructions for Claude Code

Read this file at the start of every session along with PRODUCT.md and CLAUDE.local.md. These are your operating rules for this codebase. Follow them consistently.

## Your First Step Every Session

1. Read PRODUCT.md — understand the product, philosophy, level system, and onboarding flow
2. Read CLAUDE.local.md — review deferred items and personal working notes
3. Read this file — understand how to work in this codebase
4. Ask David: "What are we building today?" — then confirm which Phase/Step from ARCHITECTURE.md it maps to
5. Build only that one thing. Do not anticipate or add adjacent features unless asked.

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
- **Current version: v3** — live on `main`, deployed to `altared-tracker.com`

---

## Branch Rules

- `main` is the live production branch — always deployed to Vercel
- All new feature development happens on branch: `v3-phase1` (kept as the working branch)
- Create feature sub-branches off `v3-phase1` for each build step:
  e.g. `step-22-feature-name`
- When David says "this is ready", merge the feature branch into `v3-phase1`
- To deploy: merge `v3-phase1` into `main` then push — Vercel auto-deploys
- Push to GitHub via HTTPS with embedded token (SSH not configured on this machine):
  `git -c credential.helper= push https://TOKEN@github.com/Ddaddy2980/DailyTracker.git main`
- All v2 branches are retired — do not use them as a base for new work

---

## File and Folder Conventions

### Directory structure to maintain

```
/app
  /onboarding             — 5-step onboarding flow (username → duration → videos → profile → goals)
  /dashboard              — unified dashboard (all users, all levels)
  /goals                  — mid-challenge goal management
  /history                — week-at-a-glance history grid
  /groups                 — accountability groups list + management
  /join/[inviteCode]      — deep-link handler for group invite codes
  /settings               — account management page (avatar menu only, not bottom nav)
  /api                    — API routes
    /checkin              — per-pillar save + rolling window advancement + group status sync
    /goals                — goal CRUD (duration + destination)
    /onboarding           — onboarding step writes
    /groups               — group CRUD (create, list, join, manage, leave/remove)

/components
  /ui                     — reusable UI primitives (buttons, cards, inputs, checkboxes)
  /dashboard              — dashboard shell, header, day navigator, and all pillar card components
                            (TuningPillarCard, JammingPillarCard, GroovingPillarCard,
                             SoloingPillarCard, DormantPillarCard, PillarCard fallback,
                             DayNavigator)
  /history                — HistoryWeekGrid, HistoryTabs, HistoryMonthGrid, HistoryProgressReport
  /goals                  — goal management components shared across onboarding and mid-challenge
                            (GoalEditorCard, GoalInputRow, ACTChecklist, GoalSuggestions,
                             ChallengeDurationEditor, ChallengePauseTools)
  /groups                 — GroupView, GroupCard, CreateGroupModal, GroupDiscoverModal,
                            GroupManageSheet, GroupInvitePanel, GroupNotificationsCard
  /onboarding             — onboarding step components
  /settings               — AccountSection, ChallengeSection, ProfileSection
  /shared                 — components used across multiple features
                            (BottomNav, UserAvatarMenu — UserAvatarMenu rendered in (app)/layout.tsx)

/lib
  /supabase.ts            — Supabase client singleton
  /types.ts               — all TypeScript interfaces and types
  /constants.ts           — app-wide constants (PILLAR_CONFIG, level thresholds, goal caps,
                            DURATION_GOAL_SUGGESTIONS per pillar for ACT-compliant goal ideas)
  /utils.ts               — shared utility functions
  /rolling-window.ts      — rolling window advancement calculation logic

/hooks
  /useUser.ts             — Clerk user + Supabase user_profile combined hook
  /useChallenge.ts        — active challenge state (day number, duration, start date)
  /usePillarState.ts      — per-pillar level, goals, and today's entry state
```

### Naming conventions

- Components: PascalCase (`TuningPillarCard.tsx`, `OnboardingDuration.tsx`)
- Hooks: camelCase starting with `use` (`useChallenge.ts`)
- Utilities and lib files: camelCase (`supabase.ts`, `rolling-window.ts`)
- Routes (folders): lowercase with hyphens (`/onboarding`, `/dashboard`)
- Database columns: snake_case matching Supabase schema exactly
- Constants: SCREAMING_SNAKE_CASE for true constants (`ROLLING_WINDOW_THRESHOLDS`, `GOAL_CAPS`)

---

## TypeScript Rules

- No `any` types — ever. Use `unknown` and narrow it, or define a proper interface.
- All Supabase responses must be typed. Define interfaces in `/lib/types.ts`.
- All component props must have defined interfaces.
- Use `type` for unions and primitives, `interface` for objects and component props.

All core interfaces and types are defined in `/lib/types.ts` — read that file before defining new interfaces.

---

## Supabase Rules

### Client setup

- Supabase client lives in `/lib/supabase.ts` — import from there, never re-initialize
- Use the Supabase server client for server components and API routes
- Use the Supabase browser client for client components
- All writes go through API routes using the service role key — never write from client components directly

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
- Policy: users can only read their own rows via anon key
- Service role bypasses RLS — used only in server-side API routes
- Never expose the service role key to the client

### v3 Table Reference

All ten migrations have been run in Supabase.

| Migration file | Status |
|----------------|--------|
| `20260410000000_v3_clean_schema.sql` | ✓ Run |
| `20260410000001_add_selected_duration.sql` | ✓ Run |
| `20260410000002_v3_groups.sql` | ✓ Run |
| `20260410000003_video_progress.sql` | ✓ Run |
| `20260410000004_pulse_state.sql` | ✓ Run |
| `20260410000005_challenge_pause.sql` | ✓ Run |
| `20260410000006_username.sql` | ✓ Run |
| `20260410000007_groups_redesign.sql` | ✓ Run |
| `20260410000008_group_name_unique_per_owner.sql` | ✓ Run |

| Table | Key columns |
|-------|-------------|
| `user_profile` | user_id, onboarding step flags (incl. username_set), active_challenge_id, selected_duration_days, username (unique, lowercase), username_set |
| `challenges` | user_id, duration_days (any integer), start_date, status, pulse_state, pause fields |
| `pillar_levels` | user_id, pillar, level (1–4), is_active, profile_score |
| `duration_goals` | user_id, pillar, goal_text, is_active |
| `destination_goals` | user_id, pillar, goal_text, status, start_date, end_date |
| `pillar_daily_entries` | user_id, challenge_id, pillar, entry_date, completed, goal_completions (jsonb — stores both duration and destination goal UUID keys) |
| `consistency_profile_sessions` | user_id, five pillar scores (0–12 each), is_reassessment |
| `consistency_groups` | id, user_id (creator), name, invite_code (unused — legacy), max_members (10), status ('active'), is_public (boolean), created_at — UNIQUE INDEX on (user_id, lower(name)) |
| `group_members` | id, group_id FK→consistency_groups CASCADE, user_id, display_name (= username), joined_at, is_active |
| `group_daily_status` | id, group_id FK, user_id, status_date, completed — UNIQUE(group_id, user_id, status_date) |
| `group_invitations` | id, group_id FK CASCADE, type ('invitation'\|'request'), from_user_id, to_user_id, status ('pending'\|'accepted'\|'declined'), created_at, expires_at (now() + 7 days) — UNIQUE partial index on (group_id, from_user_id, to_user_id) WHERE status='pending' |
| `video_progress` | user_id, video_id, watched_at |

---

## Clerk Rules

- Use `useUser()` hook in client components
- Use `auth()` from `@clerk/nextjs/server` in server components and API routes
- The Clerk `userId` is the `user_id` stored in all Supabase tables
- Protect all app routes with Clerk middleware — unauthenticated users redirect to sign-in
- `/onboarding` is accessible to authenticated users — check step flags to resume at correct screen

---

## Rolling Window Advancement Rules

Advancement is evaluated per pillar on every pillar save. Logic lives in `/lib/rolling-window.ts`.
Source of truth: `pillar_daily_entries` table.

| From | To | Window | Required | Note |
|------|----|--------|----------|------|
| Tuning (1) | Jamming (2) | Last 7 days | 4 of 7 | Strictly last 7 calendar days — entries older than 7 days do not count |
| Jamming (2) | Grooving (3) | Last 14 days | 10 of 14 | Same sliding window logic |
| Grooving (3) | Soloing (4) | Last 60 days | 48 of 60 | Same sliding window logic |

A person can remain at Tuning for an entire 60-day challenge if they do not hit 4/7 in any rolling window. Advancement is a reward for demonstrated consistency, not a guarantee of challenge duration.

---

## Goal Cap Rules

Enforced in application code at save time. Never let a user exceed these:

| Level | Duration Goals (max) | Destination Goals (max) |
|-------|---------------------|------------------------|
| Tuning (1) | 1 | 0 — not available |
| Jamming (2) | 2 | 0 — not available |
| Grooving (3) | 3 | 3 per pillar |
| Soloing (4) | 4 | Unlimited |

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

For pillar card colors, PILLAR_CONFIG structure, and icon rules,
see @.claude/skills/pillar-card-ui/SKILL.md

---

## What Not To Touch

Unless David explicitly asks:

- Do not change `package.json` dependencies without asking first
- Do not rename existing files or folders without asking first
- Do not change the Clerk configuration or middleware auth rules
- Do not modify rolling window threshold values in `/lib/rolling-window.ts` without David's explicit direction
- Do not modify the Supabase schema directly — all schema changes go through a new migration file
- Do not add columns to `pillar_daily_entries` without confirming the rolling window queries still work

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
3. State the recommended next step (which Phase/Step from ARCHITECTURE.md)
4. Flag any decisions that were made that David should be aware of

---

For routing logic, advancement thresholds, goal caps, and the full v3 build sequence — see @ARCHITECTURE.md

---
