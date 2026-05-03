# CODE_REVIEW_PLAN2.md — Implementation Plan for CODE_REVIEW_FINDINGS2.md

**Source:** `CODE_REVIEW_FINDINGS2.md` (Opus 4.6 audit, 76 findings: 16 HIGH, 38 MEDIUM, 22 LOW)
**Plan author:** Opus 4.7 grilling session (refines an earlier Sonnet 4.6 plan)
**Date:** 2026-05-02
**Status:** Approved by David. Build across multiple sessions in tier order. Each tier ships as one or more commits to `main`.

---

## Build Rules (read every session)

1. **Build tiers strictly in order: Tier 1 → Tier 2 → Tier 3.** Do not start Tier 2 work while Tier 1 has open steps.
2. **Within a tier, steps may run in any order**, but each step must complete (compile, test, commit) before moving to the next.
3. **Mark each step `[x]` in this file as it completes.** Update at the end of every session.
4. **Each tier ends with: `npx tsc --noEmit` zero errors + manual smoke test of touched flows + commit to `main`.**
5. **No new features. No scope creep.** If a finding from CODE_REVIEW_FINDINGS2.md is not in this plan, do not silently add it — surface it for discussion.

---

## Tier 1 — Timezone Fix (data integrity, ship first)

**Why first:** `todayStr()` on Vercel returns UTC. After 7 PM CDT, server-side reads/writes use the wrong calendar date. Active data corruption every evening. The pillar card DRY work is cosmetic; this is silently breaking pause/resume/completion/group state today.

**Why required-params (Option B):** Making the 6 server-callable date functions require their date param turns silent UTC bugs into TypeScript compile errors. Eight hidden call sites in supposedly-fixed code (including `/api/checkin` itself) only surface when the compiler forces an audit.

### Step 1.1 — Make date params required on 6 server-callable functions

- [x] `lib/rolling-window.ts`: change `evaluateRollingWindow(entries, level, pillar, today: string)` — remove `today?` default
- [x] `lib/rolling-window.ts`: change `evaluateAllPillars(entriesByPillar, levelByPillar, today: string)` — remove default
- [x] `lib/rolling-window.ts`: change `getWindowEntries(entries, windowDays, today: string)` — remove default
- [x] `lib/constants.ts`: change `getDayNumber(startDate, targetDate: string)` — remove default
- [x] `lib/constants.ts`: change `rollingWindowDates(windowDays, endDate: string)` — remove default
- [x] `lib/constants.ts`: change `getEffectiveChallengeDay(challenge, viewingDate: string)` — remove default
- [x] Internal `daysAgo` helper in `rolling-window.ts` keeps optional default (always called with explicit reference; default is dead code, harmless)

### Step 1.2 — Fix all date call sites the compiler flags

Pattern for API routes: `const tz = req.cookies.get('tz')?.value; const today = todayInTz(tz)`
Pattern for server components: `const tz = cookies().get('tz')?.value; const today = todayInTz(tz)`

**Direct `todayStr()` server-side call sites:**
- [x] `app/api/challenges/pause/route.ts:38`
- [x] `app/api/challenges/resume/route.ts:43, 45`
- [x] `app/api/challenges/restart/route.ts:43` (currently uses `Intl.DateTimeFormat` without timezone — same UTC bug)
- [x] `app/api/goals/destination/route.ts:94, 154`
- [x] `app/api/onboarding/goals/route.ts:113`
- [x] `app/api/groups/route.ts:25`
- [x] `app/api/groups/[id]/route.ts:29`
- [x] `app/api/groups/invitations/[id]/respond/route.ts:193, 205`
- [x] `app/(app)/history/page.tsx:66, 70`
- [x] `app/(app)/groups/page.tsx:28`
- [x] `app/(app)/completion/page.tsx:110` — `new Date().toISOString().slice(0, 10)` is the banned variant; replace with `todayInTz(tz)`

**Hidden bugs surfaced by Step 1.1's required params:**
- [x] `app/api/checkin/route.ts:152` — `rollingWindowDates(60)` now requires date
- [x] `app/api/checkin/route.ts:181` — `evaluateRollingWindow(entries, currentLevel, typedPillar)` now requires date
- [x] `app/api/checkin/route.ts:280` — `rollingWindowDates(7)` (inside `updatePulseState`, even though `today` was threaded in as a parameter)
- [x] `app/(app)/layout.tsx:32` — `getEffectiveChallengeDay(challenge)` (server component, runs on every page; needs `cookies().get('tz')?.value`)
- [x] `app/(app)/settings/page.tsx:42` — `getEffectiveChallengeDay(challenge)`
- [x] `app/(app)/dashboard/page.tsx:119` — `getEffectiveChallengeDay(challenge)` (the file's `today` constant exists but wasn't passed)
- [x] `app/(app)/dashboard/page.tsx:173` — `getDayNumber(challenge.start_date)`
- [x] `app/api/challenges/duration/route.ts:58` — `getEffectiveChallengeDay(challenge)`

**Files being deleted in Tier 2 (no Tier 1 fix needed):**
- `app/join/[inviteCode]/page.tsx` (lines 91, 100 — file deleted in Step 2.2)
- `app/api/groups/join/route.ts` (lines 127, 139 — file deleted in Step 2.2)

### Step 1.3 — Fix `paused_at` / `completed_at` write-time anchor

Both columns are written as `new Date().toISOString()` (UTC instant) then sliced for date later — a hidden timezone bug separate from `todayStr()`. User pauses at 8 PM CDT → stores `2026-05-03T01:00:00Z` → `.slice(0, 10)` → `'2026-05-03'` (tomorrow in local time) → day counter freezes wrong, `pause_days_used` accumulates wrong on resume.

Fix at write time using `${todayInTz(tz)}T12:00:00.000Z` anchor (noon UTC → date portion always matches user's local date in any IANA tz):

- [x] `app/api/challenges/pause/route.ts:85` — `paused_at: \`${todayInTz(tz)}T12:00:00.000Z\``
- [x] `app/(app)/dashboard/page.tsx:94` — same pattern (auto-activate scheduled pause path)
- [x] `app/api/challenges/complete/route.ts:32` — `completed_at: \`${todayInTz(tz)}T12:00:00.000Z\``
- [x] `app/(app)/dashboard/page.tsx:124` — same pattern (server-side completion write)

**Existing rows in test accounts may carry the wrong date.** Acceptable to leave or manually correct via SQL.

### Step 1.4 — Verify and ship Tier 1

- [ ] `npx tsc --noEmit` zero errors
- [ ] Manual smoke test: pause a challenge after 7 PM local → confirm `paused_at` shows local date in DB
- [ ] Manual smoke test: complete a challenge after 7 PM local → confirm `completed_at` shows local date
- [ ] Manual smoke test: check in after 7 PM → confirm `pillar_daily_entries.entry_date` is local date
- [ ] Commit + push to `main`

---

## Tier 2 — Security, Broken Features, TypeScript, Accessibility

### Step 2.1 — Username case-sensitivity (broken group invitations)

- [ ] `app/api/users/search/route.ts:18`: drop `.toLowerCase()`
- [ ] `app/api/users/search/route.ts:29`: change `.eq('username', username)` → `.ilike('username', username)`
- [ ] `app/api/groups/[id]/invite/route.ts:155, 163`: same fix (drop `.toLowerCase()`, change `.eq()` → `.ilike()`)
- [ ] `components/groups/GroupInvitePanel.tsx:43`: drop `.toLowerCase()` from `handleUsernameChange`; keep character filter `val.replace(/[^a-zA-Z0-9_]/g, '')`

### Step 2.2 — Delete retired routes and dead files

- [ ] Delete `app/api/groups/join/route.ts`
- [ ] Delete `app/join/[inviteCode]/page.tsx`
- [ ] Delete `components/groups/JoinGroupModal.tsx` (verified dead — exists but no imports)
- [ ] Delete `components/dashboard/DayNavigator.tsx` (orphaned after DashboardHeader merge)
- [ ] Verify `daysUntil` in `lib/utils.ts` has no consumers (`grep -rn daysUntil app/ components/ lib/`); if unused, delete entire `lib/utils.ts` file

### Step 2.3 — SQL injection in discover route

- [ ] `app/api/groups/discover/route.ts:72`: `const escaped = query.replace(/[%_\\]/g, '\\$&')` then `.ilike('username', \`%${escaped}%\`)`
- [ ] `app/api/groups/discover/route.ts:112`: same fix for `.ilike('name', ...)`

### Step 2.4 — Other security fixes

- [ ] `app/api/groups/route.ts` POST: count `consistency_groups` where `user_id = userId` AND `status = 'active'`; reject with 400 if `≥ 5`
- [ ] `app/api/onboarding/goals/route.ts`: idempotency guard at handler start — return 200 early if `user_profile.goals_setup_completed === true`
- [ ] `app/api/onboarding/username/route.ts`: catch Postgres error code `23505` → return 409 "Username is already taken"
- [ ] `app/api/settings/username/route.ts`: same `23505` catch + 409 response
- [ ] `middleware.ts`: add `'/api(.*)'` to `isProtectedRoute` matcher (defense-in-depth)
- [ ] `app/(app)/history/page.tsx:33-36`: add `.eq('user_id', userId)` to challenge fetch

### Step 2.5 — Error handling (8 components + 3 API routes)

Add `try/catch/finally` + visible error state to all of these. Error message stays in component state; loading state always cleared in `finally`:

- [ ] `components/groups/GroupManageSheet.tsx` (lines 33–101)
- [ ] `components/groups/GroupView.tsx` (line 57–67)
- [ ] `components/groups/GroupInvitePanel.tsx` (line 101–109)
- [ ] `components/groups/GroupDiscoverModal.tsx` (line 60–78)
- [ ] `components/groups/CreateGroupModal.tsx` (line 16–37)
- [ ] `components/goals/ChallengePauseTools.tsx` (lines 47–118)
- [ ] `components/onboarding/DurationPicker.tsx` (line 21–37) — add visible error state on `res.ok === false`
- [ ] `components/onboarding/ClarityVideosScreen.tsx` (line 26–56) — same

API route fixes:
- [ ] `app/api/videos/watched/route.ts:15`: wrap `request.json()` in try/catch → return 400 "Invalid JSON" on failure
- [ ] `app/api/groups/[id]/invite/route.ts` DELETE handler (lines 271–284): use `.select()` after update to verify a row matched; return 404 if no row
- [ ] `app/api/groups/[id]/invite/route.ts:105-106`: add `typeof type !== 'string'` guard on `b.type as string`

### Step 2.6 — Next.js + Supabase pattern fixes

- [ ] `app/(app)/settings/page.tsx:16-18`: drop `Promise.resolve(createServerSupabaseClient())` wrapper
- [ ] `app/(app)/dashboard/page.tsx:110`: replace `Object.assign(challenge, refreshed)` with `let challenge = ...` declaration (line ~50) and `if (refreshed) challenge = refreshed`
- [ ] `app/(app)/groups/page.tsx`: change `searchParams: Promise<{ joinError?: string }>` → `searchParams: { joinError?: string }`; remove `await searchParams` (Next.js 14 canonical pattern, matches sibling pages like `app/onboarding/profile/page.tsx`)
- [ ] `app/api/checkin/route.ts:69, 216`: pass existing `supabase` client into `syncGroupDailyStatus(...)` instead of calling `createServerSupabaseClient()` again
- [ ] `app/(app)/history/page.tsx`: narrow `select('*')` calls (5 instances on lines 23, 35, 44, 49, 62) to only required columns

### Step 2.7 — TypeScript strictness

- [ ] `lib/constants.ts`: narrow `ROLLING_WINDOW_THRESHOLDS` key type from `Record<number, ...>` to `Record<1 | 2 | 3, ...>`
- [ ] `lib/rolling-window.ts`: add level-4 typeguard before `ROLLING_WINDOW_THRESHOLDS[level]` access (e.g. `if (level === 4) return early`); replaces existing `if (!threshold)` check
- [ ] `lib/types.ts`: change `pillar: string` → `pillar: PillarName` on `PillarLevel` and `DurationGoal` interfaces (removes 6 `as PillarName` casts in `app/(app)/completion/page.tsx`, `components/history/HistoryWeekGrid.tsx`, `components/history/HistoryProgressReport.tsx`, `lib/rolling-window.ts`)
- [ ] `lib/types.ts`: narrow `GroupStatus` to `'active'`
- [ ] `lib/types.ts:276`: update `GroupMember.display_name` comment to "username from user_profile, cascaded on username change"
- [ ] `components/onboarding/OnboardingGoalsClient.tsx:43`, `components/onboarding/PillarPortrait.tsx:13`, `app/(app)/goals/page.tsx:50`: `Object.fromEntries(...) as Record<...>` → `Partial<Record<PillarName, LevelNumber>>` with `?? 1` fallback at every consumer
- [ ] `components/dashboard/PillarCard.tsx`, `GroovingPillarCard.tsx`, `SoloingPillarCard.tsx`: drop unused `userId` prop from interface; stop passing from `DashboardShell`
- [ ] `components/goals/ChallengeDurationEditor.tsx:6`: drop unused `ChallengeDuration` import
- [ ] `components/dashboard/JammingPillarCard.tsx:26`: drop unused `dayNumber` prop from interface
- [ ] `lib/constants.ts`: export `USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/`; import in `app/api/onboarding/username/route.ts:7` and `app/api/settings/username/route.ts:5`
- [ ] `app/(app)/goals/page.tsx` (lines 24–44), `app/(app)/groups/page.tsx` (lines 92–112): add `console.error` for discarded `.error` fields in parallel fetches

### Step 2.8 — Accessibility

- [ ] `components/groups/GroupManageSheet.tsx:171-183`: add `role="switch" aria-checked={isPublic}` to public/private toggle
- [ ] `components/groups/GroupCard.tsx:87-93`: add descriptive `aria-label` to check-in status circles
- [ ] `components/shared/BottomNav.tsx:11-65`: add `aria-hidden="true"` to icon SVGs
- [ ] `components/shared/BottomNav.tsx:85`: replace inline `style={{ color: isActive ? '#1e40af' : '#94a3b8' }}` with conditional Tailwind classes (`text-blue-800` / `text-slate-400`); leave the line 74 `paddingBottom` inline style alone (legitimate `env()` use)
- [ ] `components/dashboard/TuningPillarCard.tsx:264`, `JammingPillarCard.tsx:56`: add `aria-label={\`Day ${i+1}: ${mark}\`}` to rolling window dots

### Step 2.9 — Verify and ship Tier 2

- [ ] `npx tsc --noEmit` zero errors
- [ ] Manual smoke test: invite a mixed-case username to a group → confirm invitation sends
- [ ] Manual smoke test: try to create a 6th group → confirm 400 rejection
- [ ] Manual smoke test: search groups with `%` in query → confirm no info disclosure
- [ ] Commit + push to `main`

---

## Tier 3 — DRY, Code Quality, Performance

**Risk:** This tier touches a lot of files but doesn't change behavior. After every step, run the dashboard, save a pillar, navigate days, and confirm nothing visually regresses.

### Step 3.1 — Layer A: `CheckinApiResponse` to `lib/types.ts`

- [ ] Define `CheckinApiResponse` interface in `lib/types.ts`
- [ ] Remove duplicate definitions from `TuningPillarCard.tsx`, `JammingPillarCard.tsx`, `GroovingPillarCard.tsx`
- [ ] Import from `@/lib/types` in all consumers

### Step 3.2 — Layer B: Extract `ProgressRing` component

- [ ] Create `components/dashboard/ProgressRing.tsx`
- [ ] Props: `{ percentage: number, subtitleColor: string, strokeColor?: string }`
- [ ] Replace local `ProgressRing` in `GroovingPillarCard.tsx` and `SoloingPillarCard.tsx` with import + usage

### Step 3.3 — Layer C: Extract `usePillarSave` hook

- [ ] Create `hooks/usePillarSave.ts`
- [ ] Signature: `usePillarSave(pillar: PillarName, challengeId: string, entryDate: string)`
- [ ] Returns: `{ saving, saved, saveError, advancedToLevel, handleSave: (completedGoals: GoalCompletions) => Promise<void> }`
- [ ] Hook handles: fetch POST `/api/checkin`, `res.ok` guard, error state, advancement detection, `router.refresh()` after 2.5s toast
- [ ] Replace `handleSave` in: `TuningPillarCard.tsx`, `JammingPillarCard.tsx`, `GroovingPillarCard.tsx`, `SoloingPillarCard.tsx`, `PillarCard.tsx`

### Step 3.4 — Layer D: Extract reusable UI primitives

- [ ] Create `components/ui/ChevronIcon.tsx` (props: `direction: 'up' | 'down'`)
- [ ] Create `components/ui/PlayIcon.tsx`
- [ ] Create `components/ui/Spinner.tsx`
- [ ] Replace inline SVGs in: all 5 pillar cards, `CompletionScreen.tsx`, `ClarityVideosScreen.tsx`, `DurationPicker.tsx`, `OnboardingGoalsClient.tsx`, `ProfileFlow.tsx`, `UsernameSetupScreen.tsx`, `AccountSection.tsx`, `GroupInvitePanel.tsx`

### Step 3.5 — Split 7 oversized files

- [ ] `components/completion/CompletionScreen.tsx` (272 lines) → extract `PillarStatRow.tsx`, `RestartFlow.tsx`
- [ ] `components/goals/ChallengePauseTools.tsx` (252) → extract `ImmediatePauseCard.tsx`, `ScheduledPauseCard.tsx`, `ActivePauseCard.tsx`
- [ ] `components/history/HistoryProgressReport.tsx` (248) → extract `ProgressChart.tsx`, `PillarSummaryCard.tsx`
- [ ] `components/goals/GoalEditorCard.tsx` (241) → extract `GoalList.tsx`
- [ ] `components/groups/GroupManageSheet.tsx` (236) → extract `RenameGroupForm.tsx`, `DeleteGroupConfirm.tsx`
- [ ] `components/history/HistoryWeekGrid.tsx` (232) → move helper functions to `lib/historyUtils.ts`
- [ ] `components/groups/GroupDiscoverModal.tsx` (223) → extract `GroupResultRow.tsx`

### Step 3.6 — Performance Map indexing

- [ ] `components/history/HistoryWeekGrid.tsx`: pre-index entries by `"pillar|date"` key, goals by `PillarName` → O(1) cell lookups
- [ ] `components/history/HistoryMonthGrid.tsx`: same pattern
- [ ] `components/dashboard/TuningPillarCard.tsx`: convert `windowEntries` to `Map<string, PillarDailyEntry>` before dot render loop
- [ ] `components/dashboard/JammingPillarCard.tsx`: same
- [ ] `components/dashboard/DashboardShell.tsx:96-155`: wrap per-pillar `windowEntries.filter()`, `durationGoals.filter()`, `destinationGoals.filter()` in `useMemo` Maps keyed by pillar
- [ ] `components/groups/GroupCard.tsx:25-29`: wrap `[...group.members].sort(...)` in `useMemo([group.members, currentUserId])`
- [ ] `components/groups/GroupDiscoverModal.tsx:82-89`: wrap `groupedByOwner` reduce in `useMemo([results, isUsernameSearch])`
- [ ] `components/groups/GroupDiscoverModal.tsx:34-37`: add `setSearching(false)` in early return when query is empty (fixes spinner-stuck bug)
- [ ] `app/(app)/completion/page.tsx:99-101`: store `completedEntries` count in `pillarStats` during construction; remove the second filter pass

### Step 3.7 — Pattern cleanup and shared utilities

- [ ] `app/(app)/completion/page.tsx:76`: import `PILLAR_ORDER` from `@/lib/constants`; delete local copy
- [ ] `lib/rolling-window.ts:20-21`: consolidate two `@/lib/constants` imports into one statement
- [ ] `lib/pulse.ts:29-31`: extract `PULSE_THRESHOLDS = { smooth: 5, rough: 3 }` to `lib/constants.ts`; import
- [ ] `components/dashboard/DashboardHeader.tsx:24-28`: drop local `addDays`; import from `@/lib/constants`
- [ ] Create `lib/supabaseUtils.ts` with `getActiveChallenge(userId, supabase)` returning `{ challenge, error }`; use in `app/api/challenges/pause/route.ts`, `resume/route.ts`, `duration/route.ts`, `restart/route.ts`, `complete/route.ts` (replaces ~15 lines × 5 routes of repeated profile→challenge fetch + ownership verify)
- [ ] Create `lib/historyUtils.ts` with `computePillarCompletion(entry, goals)` shared helper; use in `HistoryWeekGrid.tsx` and `HistoryMonthGrid.tsx`

### Step 3.8 — Verify and ship Tier 3

- [ ] `npx tsc --noEmit` zero errors
- [ ] Smoke test: dashboard renders; pillar save works; advancement toast still fires; history grids render correctly; group cards render with sorted members
- [ ] Confirm no file in `components/` exceeds 200 lines except `BottomNav` (<100) and other small files
- [ ] Commit + push to `main`

---

## Out of Scope (deferred)

These findings from CODE_REVIEW_FINDINGS2.md are NOT in this plan. If you want them addressed, surface and re-grill:

- All accessibility findings beyond Step 2.8 (e.g. focus indicators, semantic landmarks)
- `select('*')` narrowing beyond `history/page.tsx` (still present in `dashboard/page.tsx`, `pause/route.ts`, `resume/route.ts`, `duration/route.ts`)
- TOCTOU race condition on group join (the `23505` catch in Step 2.4 covers username — group_members has its own potential race)
- `VIDEO_LIBRARY` typed as `Record<string, VideoEntry>` — still allows mistyped IDs at runtime
- `addDays` date format validation (`if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw`)
- Standardizing API response shapes (`{success: true}` vs `{ok: true}`)
- Adding explicit `dynamic = 'force-dynamic'` to onboarding pages
- `useState initializer stale on prop change` documentation note on pillar cards

---

## Session Protocol

At the start of every session that picks this plan back up:
1. Read this file end to end.
2. Find the first unchecked `[ ]` item in the current tier — that's your next step.
3. After completing each step, mark `[x]` and commit.
4. At end of session, update CLAUDE.local.md with what shipped and what's next.
