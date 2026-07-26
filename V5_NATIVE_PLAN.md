# v5 — Native iOS App (Expo / React Native)

> **BUILD STATUS: APPROVED, NOT STARTED (plan approved 2026-07-25).** No code written. No files changed.
> `main` is still v3; `v4-phase1` is 12 commits ahead and unmerged.
>
> - [ ] **Step 0** — Make production the v4 backend · *Sonnet 5*
> - [ ] **Step 1** — The spike (Expo + Clerk + HealthKit + GoalRing) · *Sonnet 5 → Fable 5 on the two unknowns*
> - [ ] **Step 2** — Backend: six composite read endpoints · *Sonnet 5*
> - [ ] **Step 3** — Native dashboard · *Opus 5*
> - [ ] **Step 4** — History / Goals / Groups / Settings · *Sonnet 5*
> - [ ] **Step 5** — Onboarding (the NUX build, natively) · *Opus 5*
>
> **Web feature work is FROZEN as of this plan.** No new web features. `components/` is legacy.

## START HERE (reading this cold in a future session)

1. Read this file end to end. It is self-sufficient — you do not need the conversation that produced it.
2. Work the **first unchecked step** in BUILD STATUS above. Do not skip ahead; Step 1 is a go/no-go gate on the whole architecture.
3. **Switch to the model named on that step** (see Model allocation below) before starting.
4. Mark `[x]` and append a one-line status note when a step ships. Commit per step; David pushes.
5. Supporting reading, only if the step needs it: `ARCHITECTURE.md` §"v4 Phase 1" (every dashboard timing and rule — Step 3), `V4_NUX_PLAN.md` (the onboarding decisions — Step 5), `V4_PHASE1_PLAN.md` (the Step-6 smoke checklist — Step 3 verification).

### David's prerequisites — start these before Step 1, they have lead time

- [ ] **Apple Developer Program enrollment** — $99/yr, required for the HealthKit entitlement and TestFlight. Approval is not instant. **Claude cannot do this for you.** This is the long pole; start it whenever, it doesn't block Step 0.
- [ ] A GitHub PAT for the Step 0 push (per CLAUDE.md: HTTPS with embedded token; never paste it into chat).

---

## Context

**Ultimately this becomes an Apple app.** Apple Health is native-only — there is no web API for HealthKit, and an installed PWA cannot read it. Home-screen widgets, Apple Watch, Live Activities and real APNs push are the same story. PRODUCT.md line 63 already flagged this ("structurally unavailable to a PWA"). Everything past this point requires a native binary.

**Where the project stood at the fork:** v4 Phase 1 complete and pushed to `origin/v4-phase1` — streaks/grace, dashboard redesign, press-and-hold check-in, Tempo debut. Migration `20260410000009` run. `main`/production still v3. The NUX build was planned but not approved (`V4_NUX_PLAN.md`, paused at D3). Inventory: **3 of 11 v4 sections built** — the engine is done, most of the gamification layer is not.

**Why fork now instead of finishing v4 on web:**

- **Zero live users.** Both alpha testers finished; nothing to protect. This is the cheapest this move will ever be.
- **The next web build was the wrong one.** §3 Notifications is Phase 2 and the most platform-specific thing left — iOS Web Push only works for a Home-Screen-installed PWA, so it is 100% throwaway under native (APNs instead). Worse, its dependency shaped the *onboarding* design: the whole reason NUX was sequenced first was §3's "hard-sell Add-to-Home-Screen" gate. **That gate evaporates on native.** Building NUX on web would bake in a requirement native doesn't have.
- **The expensive part is already portable.** Verified: `lib/` (2,303 lines — the 720-line streak engine, rolling-window, constants, types, tempo, historyUtils, pulse) has **zero** imports from `next`, `react`, or `@clerk`. It moves verbatim.
- **The backend is already a clean server API.** One service-role Supabase client, server-only (`lib/supabase.ts`); 25 API routes each guarded by Clerk `auth()`. A native client talks HTTP to exactly this. No rewrite.

**What is genuinely lost:** the v4 Phase 1 dashboard's CSS/DOM implementation — `V4PillarCard`, `GoalRing`, `HeroRing`, and the shimmer/atmosphere/seal-cascade in `globals.css`. Roughly 1,500 lines of components. The *design* survives intact (mockup, colors, timings, interaction model are all documented in ARCHITECTURE.md); only the rendering layer gets rebuilt. That is the price, and it is bounded.

**Interactive features:** Tempo as a real AI chat coach, and interactive charts/journey. Both are platform-neutral — they build fine either way and don't force the timeline. HealthKit is the thing that forces native, and its weight in the product is undecided pending the spike.

## Decision: Expo / React Native, iOS-first, in this repo, Next.js API as the backend

**Not Capacitor** — it wraps a web UI about to stop being maintained, and a thin web-view shell is the classic App Store Guideline 4.2 rejection.

**Not Swift** — it would retranslate 2,300 lines of production-verified domain logic, including the streak engine that took a whole phase to get right, with a chance to break it at every line.

Expo keeps `lib/` and all 25 API routes and rewrites only the UI. Honest caveat: **Apple Watch is React Native's real weak spot** and will need a Swift extension later. Widgets and Live Activities are reachable via a native target, not pure RN.

---

## Repo shape

Add `mobile/` alongside the existing app in **this same repo**. No monorepo tooling to learn, one git history, Claude Code sees both sides in one session.

```
DailyTracker/
  app/          ← Next.js: API routes (the backend) + a marketing/sign-up site later
  lib/          ← SHARED. Imported by both. Stays platform-neutral — enforce this.
  components/   ← web UI. Frozen, then deleted when the native screen replaces it.
  mobile/       ← NEW: Expo app
```

`lib/` is reached from `mobile/` via a tsconfig path alias plus Metro `watchFolders` (Metro will not resolve code above its project root without it — this is the one config gotcha).

**Standing rule from here on:** new domain logic goes in `lib/` or an API route, never in a component. That is what keeps the port cheap and what makes the remaining 8 v4 sections mostly reusable.

---

## Model allocation (switch per step)

Two separate pots that **do not compete**: ~$77 of promotional credit is the only way to reach Fable 5 and does *not* draw on the Pro subscription; Opus 5 and Sonnet 5 draw on the subscription and never touch the credit. The credit is additive capacity — use it or lose it.

On Pro, the scarce resource across this build is **subscription usage limits, not dollars.** Limits are weighted by model cost, so running mechanical work on Opus is where a Pro plan quietly bleeds out. Default to Sonnet 5 and step up deliberately.

| Step | Model | Why |
|---|---|---|
| **0** — v4 backend to production | **Sonnet 5** | Delete crons, one migration file, a fast-forward. Mechanical. |
| **1** — spike, scaffolding | **Sonnet 5** | `create-expo-app`, config, Expo HealthKit plugin setup — following docs. Don't burn Fable credit on boilerplate. |
| **1** — spike, the two unknowns | **Fable 5** (credit) | ① the Clerk-Expo → Next.js `auth()` bridge *if it doesn't validate first try*; ② `GoalRing`'s hold gesture in Reanimated. Genuinely unsolved, high ambiguity, decides the whole architecture. If the auth bridge just works, save the credit for Step 3. |
| **2** — six read endpoints | **Sonnet 5** | Near-mechanical lifts of parallel-fetch blocks that already exist in the server pages. |
| **3** — native dashboard | **Opus 5** | The product. Intricate optimistic-commit and seal-cascade orchestration where a subtle mistake is expensive to find later. Spare Fable credit belongs here. |
| **4** — History / Goals / Groups / Settings | **Sonnet 5** | Pattern repetition against the Step 2 endpoints. |
| **5** — onboarding (NUX) | **Opus 5** | Design-sensitive and judgment-heavy; reopens the `V4_NUX_PLAN.md` decisions. |
| Architecture calls, planning, grill sessions | **Opus 5** | Judgment, not typing. |

**Rule of thumb:** mechanical or pattern-following → Sonnet 5. Design-sensitive or judgment-heavy → Opus 5. A genuinely unsolved problem where you'd otherwise be stuck → Fable 5, while the credit lasts.

**Caveat on Fable 5:** its edge is on long autonomous runs given the whole problem up front — single requests can run many minutes. It rewards "here is the hard problem, go" over interactive back-and-forth. Don't reach for it in a step-by-step working session.

---

## Build sequence

### Step 0 — Make production the v4 backend · **Sonnet 5**

The native app needs a live v4 API to talk to (`checkin_merge_goal`, `streak_state`, `daily_summary`). Today production is v3.

- **Merge `v4-phase1` → `main`, deploy to Vercel.** Verified clean fast-forward: `main` is a strict ancestor (12 commits behind, 0 ahead), so no conflicts are possible. With zero users this is free, and it resolves NUX open question D10.
- **Delete the 5 dead crons in `vercel.json`** — 4 point at `/api/notifications/cron`, 1 at `/api/gauge/recalculate`; **neither route exists** and every run 404s against production. The §3 notifications build will declare its own tz-aware schedule later.
- **Fix the migration drift** documented in `V4_NUX_PLAN.md` FINDINGS: `supabase/migrations/20260410000006_username.sql` still adds a `username_lowercase` CHECK and a plain index, but the live DB has both dropped and a `user_profile_username_ci` UNIQUE on `lower(username)` (applied by hand, never captured). Replaying migrations on a fresh project today yields a DB that **rejects the mixed-case usernames the app writes.** Write a new idempotent migration recording what was done by hand — safe to run against the live DB where it is already true.

### Step 1 — The spike · **Sonnet 5, → Fable 5 on the two unknowns**

**Do this before committing to anything else.** A throwaway Expo app that proves four unknowns end to end, installed on David's phone via a dev build.

| Unknown | What proves it |
|---|---|
| Clerk Expo → Next.js `auth()` | Sign in with the Expo SDK against the **existing** Clerk instance, call one live API route with the session token, get real data back |
| HealthKit is worth it | `react-native-health` reads today's step count and displays it (requires a dev build, not Expo Go) |
| Animation story is good enough | Rebuild **`GoalRing`** — the 450ms press-and-hold fill — in Reanimated + `react-native-svg`. It is the single most demanding interaction in the app. If this feels right, everything else does. |
| Apple Developer enrollment | See prerequisites above — David's to do, has lead time |

**Exit criteria:** David holds his phone, signs in as David2 (`djett@crossgates.org`, the disposable test account), sees his real streak from live data, and holds a ring to commit a goal.

**If the spike fails, we reconsider Swift before spending months.** That is the point of doing it first.

### Step 2 — Backend: the read API · **Sonnet 5**

The only real gap. Writes are already API routes; **reads are inline in the server pages**, which a native client cannot call. Measured, by inline Supabase query count:

| Screen | Queries | New endpoint |
|---|---|---|
| `app/(app)/dashboard/page.tsx` | 8 | `GET /api/dashboard` |
| `app/(app)/groups/page.tsx` | 7 | `GET /api/groups/overview` |
| `app/(app)/history/page.tsx` | 5 | `GET /api/history` |
| `app/(app)/completion/page.tsx` | 5 | `GET /api/completion` |
| `app/(app)/goals/page.tsx` | 4 | `GET /api/goals/overview` |
| `app/(app)/settings/page.tsx` + `(app)/layout.tsx` | 2 + 2 | `GET /api/me` |

Six composite endpoints, each a near-mechanical lift of the page's existing parallel-fetch block. The onboarding pages are excluded — they're being replaced by the NUX redesign, not ported.

Keep the timezone rule intact: `todayStr()` is client-only and `toISOString().slice(0,10)` is banned. These routes accept the timezone as a header/param instead of the `tz` cookie — `todayInTz(tz)` is already the right shape.

Web keeps working untouched throughout this step.

### Step 3 — Native dashboard · **Opus 5**

The product is the dashboard; build it first and completely. Port order mirrors the existing tree: `HeroCard` + `HeroRing` → `DayStrip` → `V4PillarCard` → `GoalRing` (from the spike) → `WhisperRow` → seal cascade + atmosphere.

`DashboardShell`'s orchestration logic — the optimistic `completions` map, the FIFO commit queue in `useGoalCommit`, the cascade timings — transfers almost line for line; only the rendering changes.

**`ARCHITECTURE.md` §"v4 Phase 1" documents every timing and rule. Follow it verbatim rather than re-deriving.** In particular the architectural rules it establishes: `streak_state` covers through yesterday only and today's seal is a live `+1`; per-goal commits merge atomically in Postgres and are queued client-side; the shell re-seeds all optimistic state on day navigation.

### Step 4 — Remaining screens · **Sonnet 5**

History, Goals, Groups, Settings. Straight ports against the Step 2 endpoints.

### Step 5 — Onboarding (the NUX build, natively) · **Opus 5**

`V4_NUX_PLAN.md`'s design survives the fork; its open questions need re-answering in the new context:

- **Still valid as written:** D3 (the Claude API call mapping free text → pillar + ACT goal — build it as an API route, it's portable), D4 (Profile at day 3–5), D6 (auto 21-day challenge), D7 (seal Day 1 in the first session), D9 (Tempo copy volume — still the likeliest ship blocker; every video URL has been `''` for a year).
- **Changed by the fork:** D2's migration shape (no PWA gate columns), D5 (username deferral), **D8 — the Web Speech API mic problem disappears**; iOS native speech recognition is better and permission-gated properly.
- **Gone:** the Add-to-Home-Screen hard-sell. Native install is the App Store. D10 (branch strategy) is resolved by Step 0.

### Then — the rest of v4, natively

§3 Notifications becomes APNs/Expo Push (strictly better than the Web Push path, and no longer install-gated). §5 gauge and §6 badges/Journey are mostly `lib/` logic plus the interactive charts. §2 Tempo LLM chat is platform-neutral. HealthKit auto-fill for Physical/Nutritional lands wherever the spike says it deserves to.

---

## Verification

- **Step 0:** `altared-tracker.com` serves the v4 dashboard; `vercel.json` has no crons pointing at missing routes; migrations replay cleanly onto a scratch Supabase project and accept a mixed-case username.
- **Step 1:** dev build installed on the iPhone; signed in as David2; real streak rendered from live data; step count read from Health; hold-to-commit feels right in hand.
- **Step 2:** each new endpoint returns exactly what its server page renders today — diff the JSON against the page's fetch results before trusting it. Web is unchanged.
- **Step 3:** the Step-6 smoke checklist from `V4_PHASE1_PLAN.md`, re-run on device: hold-to-commit, pillar ignite, full-day seal cascade + gold, hero ring, advancement modal, reduced-motion.
- **Throughout:** `npx tsc --noEmit` clean at the repo root after every step — one typecheck covers `lib/`, the API, and `mobile/`.

> **Note on dev servers:** Claude's Bash runs on the Mac Mini in a sandbox with isolated networking, so a server it starts is not reachable from David's MacBook browser. Same constraint applies to Metro. David runs the dev server in his own terminal.

## Risks

| Risk | Mitigation |
|---|---|
| Clerk Expo token → Next.js `auth()` doesn't validate cleanly | First thing the spike tests. Fallback: verify the JWT directly in a shared middleware. |
| `react-native-health` is a community package | Spike proves read access; if it's shaky, a small Swift module for HealthKit reads only is a contained fallback. |
| Reanimated can't match the CSS shimmer/atmosphere feel | `GoalRing` in the spike is the canary. Skia is the escalation path. |
| Apple Watch / widgets | Genuinely weak in RN. Deferred; a Swift target reading a shared App Group is the eventual answer. Don't design around them yet. |
| Two front-ends drift during Steps 2–4 | Web is **frozen** at Step 0 — no new web features. It becomes the marketing/sign-up site once the native app ships. |
