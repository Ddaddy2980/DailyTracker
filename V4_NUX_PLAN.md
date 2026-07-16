# v4 — New User Experience (NUX) Build

> **STATUS: PLANNING — grilling session PAUSED mid-way 2026-07-16. Not approved, no code written.**
> Precedent: `V4_PHASE1_PLAN.md`. Design source: PRODUCT.md §v4 (§2, §10 primarily).
> Branch: TBD (D10). Depends on v4 Phase 1 (branch `v4-phase1`, complete).

## HOW TO RESUME (read this first)

The grilling session (skill: `grill-me`) got through **D1 and D2**. It paused with **D3 asked but
unanswered** — David had an appointment. To pick back up:

1. Read this file end to end (it is the session's full state).
2. **Re-ask D3** (Claude API dependency + model choice — the question and the recommendation are
   written out in full under OPEN QUESTIONS below; just re-put it to David).
3. Continue the grill through D4–D11, appending each answer to the DECISIONS LOG as you go.
4. When all decisions are resolved, convert this file into the actual build plan — same shape as
   `V4_PHASE1_PLAN.md`: a BUILD STATUS checklist at the top, Core design, a numbered build sequence
   table (each step committable, `npx tsc --noEmit` after each), Verification, and Risks/edge cases.
5. Get David's approval on the plan before writing any code.

**Session rules that carried over:** ask one question at a time, each with a recommendation; explore
the codebase rather than asking anything the code can answer; no code until the plan is approved.

## Context

v4 Phase 1 shipped §1 (streaks/grace), §9 (dashboard redesign), and a thin slice of §2 (Tempo's
celebration lines — ~48 lines vs. the ~300+ the spec calls for). Eight of PRODUCT.md §v4's eleven
design sections remain unbuilt. This build is the next slice.

**Zero live users as of 2026-07-16.** Both alpha testers finished; David is fine with the current
version going dead. This unlocks options (clean-schema rebuild, start-at-0 streaks, free deletion
of dead surfaces) that were closed during Phase 1.

---

## SESSION LOG

**2026-07-16 — planning session 1 (paused mid-grill).** No code written. Established:

- Asked "what's needed for Phase 2?" → Phase 2 is §3 Notifications. Found it has an **iOS install-gate
  dependency** on the onboarding hard-sell, so David sequenced **onboarding first**.
- David reframed the work: "almost a total rebuild," more gamified, more user-friendly, reusing what
  can be reused. **Zero live users** — both alpha testers finished, v3/production can go dead.
- Read the full v4 back-work (PRODUCT.md §§1–12, `V4_PHASE1_PLAN.md`, ARCHITECTURE.md v4 section).
  Inventory: **3 of 11 sections built**.
- Started the `grill-me` session → **D1 (scope = B)** and **D2 (additive migration, history kept)**
  decided. **D3 asked, unanswered** — session ended for an appointment.

Next session: re-ask D3, continue D4–D11, then write the build plan. See HOW TO RESUME above.

## DECISIONS LOG

Appended live during the grilling session. Each entry: the question, the answer, the reasoning.

### D1 — Scope of this build: "B — New User Experience" (DECIDED 2026-07-16)

**Question:** Is the unit of work §10 onboarding alone (A), §10 + the §2 video retirement + the
Consistency Profile relocation (B), or the full remaining v4 rebuild across all 8 unbuilt sections (C)?

**Answer: B.**

**Reasoning:** §10 cannot ship cleanly alone — it deletes the clarity-video onboarding gate while §2's
video retirement is nominally Phase 4; it promises a "seal Day 1 in the first session" first-win that
leans on the Phase-1 streak engine; and it relocates the Consistency Profile to a day-3–5 Tempo offer,
which needs a Tempo surface to deliver it. Cutting only §10 (option A) would leave three seams
half-open for Phase 4 to re-open. Option C (all 8 sections — notifications, gauge, badges, Journey,
reflections, social, comeback) is too large to plan coherently and depends on decisions not yet made.

B is the smallest slice that leaves no seam half-cut. The video-system retirement in particular will
never be cheaper than it is right now with zero users.

**Scope boundary — IN:**
- §10 Onboarding Redesign (sign-up → begin screen → starter goal → dashboard, under a minute)
- §2 video system retirement (`/videos` page, card video buttons, `video_progress`, clarity-video gate)
- Consistency Profile relocation (onboarding gate → day-3–5 offer)
- Tempo line-library growth to cover what the video system used to say

**Scope boundary — OUT (separate builds, sequenced later):**
- §3 Notifications · §4 Variable Delight · §5 Gauge + Life on Purpose Score
- §6 Badges + Journey page · §7 Investment loop · §8 Social pull · §11 Comeback flow

### D2 — Schema strategy: additive migration, history preserved (DECIDED 2026-07-16)

**Question:** Clean-schema rebuild (v3 precedent) or additive migration? Does David's own 3+ months of
daily-use history survive?

**Answer: Additive migration. History is preserved.**

**Reasoning:** The v3 clean-schema precedent does **not** apply. v2→v3 rebuilt because the *table
architecture* changed (per-pillar model made the old tables structurally wrong). The NUX build changes
the *flow* through the tables, not their shape — `user_profile`, `challenges`, `pillar_levels`, and
`duration_goals` all keep their structure. A clean rebuild would buy "23 migration files → 1"
(cosmetic) at the cost of retranscribing 10+ tables, their RLS policies, indexes, and the
`checkin_merge_goal` function — every one a chance to break a system that currently works and is
smoke-verified.

David wants his history kept but explicitly not "at the expense of this rebuild being crippled."
**There is no such trade-off:** the new onboarding flow only ever runs for *new* users. David already
has a completed profile, an active challenge, and a populated `streak_state` row, so his
`pillar_daily_entries`, `duration_goals`, `pillar_levels`, `daily_summary`, and streaks are untouched
by everything in scope. The dropped artifacts are worthless to him (gate columns are all `true` and
about to stop being read; `video_progress` tracks videos whose URLs have been `''` for a year).

**Standing commitment:** if preserving history turns out to cripple something mid-build, STOP and flag
it — do not quietly wipe.

**Testing note:** keeping David's account means he can't experience the new onboarding himself. Use the
existing second test account (`David2` = djett@crossgates.org, `user_3Ca7cxgeR6R02TFBs4RGOiznlWm`) as
the disposable NUX test account; reset it as needed.

**Migration shape (draft — additive, one file):**
- drop dead onboarding gate columns from `user_profile` (username_set, challenge_duration_selected,
  clarity_videos_seen, consistency_profile_completed, goals_setup_completed — exact set TBD by D5/D6)
- `DROP TABLE video_progress`
- make `username` genuinely nullable for the deferred-username placeholder (D5)
- **fix the username index drift**: drop `username_lowercase` CHECK + `idx_user_profile_username`,
  create `user_profile_username_ci` UNIQUE on `lower(username)` — i.e. write the migration that
  documents what was already done by hand (see FINDINGS)
- possibly one new column to track the day-3–5 Profile offer (D4)

---

## OPEN QUESTIONS (grilling paused here)

### D3 — Claude API dependency + model choice — **ASKED, AWAITING DAVID'S ANSWER**

This is the exact question the session paused on. Re-ask it as written.

**Context:** PRODUCT.md §10 line 76 wants one structured call: free text (or mic transcript) → a pillar
+ an ACT-compliant starter goal the user confirms/tweaks, with a keyword fallback on failure.
Non-conversational, single-shot, no agent loop, no streaming. This is the **first LLM in the app**.

**Dependency:** one package — `@anthropic-ai/sdk`. **No zod needed** — the schema goes inline as raw
JSON Schema via `output_config.format` (verified: the project has no zod, and only 4 runtime deps —
`@clerk/nextjs`, `@supabase/supabase-js`, `next`, `react`/`react-dom`). Structured outputs are
supported on Opus 4.8, Sonnet 5, and Haiku 4.5, so all three candidate models work.

**David must:** create an Anthropic API key and add `ANTHROPIC_API_KEY` to Vercel env + `.env.local`.

**Cost math** — ~1–1.5K tokens in (5 pillar definitions + ACT rules + their sentence), ~150 tokens out:

| Model | Price /MTok | Per signup |
|---|---|---|
| Opus 4.8 (`claude-opus-4-8`) | $5 / $25 | ~1¢ |
| Sonnet 5 (`claude-sonnet-5`) | $3 / $15 (intro $2/$10 through 2026-08-31) | ~0.5¢ |
| Haiku 4.5 (`claude-haiku-4-5`) | $1 / $5 | ~0.2¢ |

**Recommendation: Opus 4.8.** The call fires *at most once per user* — only at signup, and only when
they type/speak instead of tapping a desire button. The whole spread between cheapest and most capable
is ~0.8¢ per user. It fires at the highest-stakes moment in the product: the first thing a new person
ever does. A wrong pillar mapping ("I want to stop snapping at my kids" → Personal instead of
Relational) or a goal that fails the T in ACT poisons the first-win that §10 line 77 is built around.
Not a place to save a fraction of a cent.

**Honest counter-argument:** first LLM = a new Anthropic bill where there wasn't one, plus a new
failure mode (API down / rate limited / slow) on the critical path — though the specced keyword
fallback covers that.

### D4–D11 — not yet asked

- [ ] D4 — Consistency Profile at day 3–5: may it activate pillars and thereby raise the sealing bar
      mid-streak? (The streak engine handles history correctly — `daily_summary` snapshots
      `pillars_required` per day, so past days stay sealed — but from the activation day forward a
      sealed day costs more work than it did yesterday. The user experiences the Profile as the thing
      that made their streak harder to keep. Product decision, not an implementation detail.)
- [ ] D5 — Username deferral (§10 line 80: placeholder derived from email) vs. the
      `user_profile_username_ci` UNIQUE index on `lower(username)` + `group_members.display_name`
      populated from username at join time. Placeholder scheme must be collision-safe; decide what a
      group shows for someone who never set a real username.
- [ ] D6 — Auto 21-day challenge (§10 line 79): challenge row created at sign-up, or at goal creation?
      (v3 creates it at the goals step.)
- [ ] D7 — "Seal Day 1 in the first session" (§10 line 77) vs. the streak engine's invariant that
      `streak_state` covers **through yesterday only** and today's seal is a live `+1`.
- [ ] D8 — Web Speech API mic (§10 line 75): ship, defer, or drop — iOS Safari support is the risk.
- [ ] D9 — Tempo copy volume: §2 calls for ~300+ curated lines; `lib/tempo.ts` has ~48. Retiring the
      video system moves all A/B/C/D/J/G coaching moments onto Tempo cards, so this build needs
      meaningfully more copy. **Who writes it, and is copy a ship blocker?** (Precedent worth heeding:
      every video URL has been `''` for a year — copy has historically been the bottleneck.)
- [ ] D10 — Branch strategy + whether to merge `v4-phase1` → `main` now. (See FINDINGS: hold-main now
      protects nothing and blocks iOS Web Push testing for the §3 build that follows.)
- [ ] D11 — Build sequence / step breakdown (the output artifact).

---

## FINDINGS (from codebase exploration during planning)

### Migration history does not reproduce the live database (found 2026-07-16)

`supabase/migrations/20260410000006_username.sql` still contains:

```sql
ADD CONSTRAINT username_lowercase CHECK (username = lower(username));
CREATE INDEX idx_user_profile_username ON user_profile (username);
```

The live database has that CHECK constraint **dropped** and a `user_profile_username_ci` UNIQUE index
on `lower(username)` instead — applied via direct SQL, never captured in a migration file (documented
in ARCHITECTURE.md Phase 9 as a "post-Phase 9 schema update"). Replaying the 23 migrations against a
fresh Supabase project today yields a database that **rejects the mixed-case usernames the app writes**.

Implication: the migration history is not a reliable rebuild path. **D2 chose additive over a clean
rebuild**, so the NUX migration must include the 3-line drift fix (drop the CHECK + old index, create
`user_profile_username_ci`) — i.e. write the migration that documents what was already done by hand.

### v4 is ~3 of 11 sections built (inventoried 2026-07-16)

Phase 1 shipped §1 (streaks/grace), §9 (dashboard redesign), and a thin slice of §2 (Tempo's
celebration lines — ~48 lines vs. the ~300+ the spec calls for). Still pure spec:

| § | Section | State |
|---|---|---|
| 2 | Tempo full — Ask sheet, settings dial, 30-day no-repeat, **video system retirement** | ~15% (lines only) |
| 3 | Notifications — Web Push, tz cron, Tempo copy | nothing + 5 dead crons |
| 4 | Variable Delight | nothing |
| 5 | Consistency Gauge + Life on Purpose Score | nothing (v3 specced it too, never built) |
| 6 | Badges + Journey page | nothing |
| 7 | Investment loop — reflections, "why this matters" | nothing |
| 8 | Social pull — reactions, group streak | nothing |
| 10 | Onboarding redesign | nothing |
| 11 | Journey lifetime view + comeback flow | nothing |

The engine and the dashboard are done; most of the gamification layer is not.

### Five dead crons are firing against production right now

`vercel.json` declares 5 crons — 4 → `/api/notifications/cron`, 1 → `/api/gauge/recalculate`.
**Neither route exists**; every run 404s. They're also fixed-UTC (`0 13 * * *` for "morning"), which is
exactly the bug PRODUCT.md §3 line 35 calls out. Not in NUX scope, but they belong to the §3
notifications build — decide then whether to delete or implement. (Cheap cleanup available any time.)

### §3 Notifications has an iOS install-gate dependency (drives sequencing)

iOS only delivers Web Push to a PWA installed to the Home Screen, and the permission prompt must fire
from a user gesture — which is why §3 line 33 says onboarding "must hard-sell Add-to-Home-Screen +
Allow Notifications." **Notifications and onboarding are coupled**; building §3 first would mean most
iOS users have no way to receive what it sends. This is why David sequenced onboarding first (see
SESSION LOG). It also means an ephemeral Vercel preview URL can't carry the install — §3 likely forces
the merge-to-main call (D10).

### Missing / drifted dependencies (verified 2026-07-16)

- No `@anthropic-ai/sdk`, no `zod`. Runtime deps are only: `@clerk/nextjs`, `@supabase/supabase-js`,
  `next`, `react`/`react-dom`.
- **Doc drift:** CLAUDE.md says "Auth: Clerk (`@clerk/nextjs` v7)" but `package.json` pins `^6.39.1`.
  Minor; fix when CLAUDE.md is next touched.
