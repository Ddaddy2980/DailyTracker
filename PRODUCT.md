# Daily Consistency Tracker — Product Reference Document

This file is the authoritative source of truth for this product. Read this file at the start of every Claude Code session before writing any code.

---

## What This App Is

The Daily Consistency Tracker is a faith-integrated habit-formation web app built around a single premise: lifestyle changes that become lifestyle habits result in lifelong transformation. The app guides users through a progressive level system — from first-time habit builders to people who coach others — using a framework of duration goals (not destination goals) across four pillars of life.

The app is owned and operated by David under Altared Life, LLC.

---

## The Core Philosophy (Read This First)

### Three Purposes Framework

- **Living for Purpose** — the person's why (their life has meaning and they know it)
- **Living with Purpose** — the person's what (a focused direction for their life)
- **Living on Purpose** — the person's how (the daily habits that make the why and what real)

This app teaches and builds the *how* — Living on Purpose — as the essential foundation before destination goals can stick.

### Duration Goals vs. Destination Goals

- **Destination goals** target an endpoint ("run a marathon", "lose 20 lbs") — they produce the **Rollercoaster Effect**: begin, endure, arrive, return.
- **Duration goals** target consistency over time ("walk 20 minutes every day") — they produce lifestyle change and genuine habit formation.
- Every goal in this app is a duration goal.

### The ACT Test

Every duration goal must pass three criteria before being saved:

- **A — Attainable:** Can this be done on the worst day of the year?
- **C — Challenging:** Does it require genuine intention and effort?
- **T — Trackable:** Is there a clear, binary way to confirm it was done?

### The Five Attacks Against Consistency

1. The Awkwardness of Transitions
2. The Short-Sightedness of Destination Goals
3. The Tyranny of the Urgent
4. The Loss of Focus (25/5 Rule)
5. The Power of Habits (works for and against)

---

## The Four Pillars

| Pillar | Focus | Examples |
|--------|-------|---------|
| Spiritual | Faith, reflection, connection to God | Scripture, prayer, devotional |
| Physical | Body stewardship, movement, health | Exercise, walking, sleep, steps |
| Nutritional | Fueling the body well | Water intake, vegetables, protein, fasting |
| Personal | Whole-person development | Reading, writing, creativity, emotional health |

---

## Level System — The Progression Architecture

Users move through five levels based on proven consistency. All new users start at Level 1.

### Level 1 — Starter

- Challenge length: 7 days
- Pillars: 1–2 pillars only
- Goals per pillar: 1 goal
- Experience: Fully guided, hand-held, gamified
- Unlock criteria: Complete one 7-day challenge
- Key features: Onboarding flow, video coaching library, gamified 7-day map, daily notifications, celebration sequence

### Level 2 — Builder

- Challenge length: 14 or 21 days
- Pillars: 2–3 pillars
- Goals per pillar: 1–2 goals
- Experience: Much encouragement, daily check-ins, weekly summary
- Unlock criteria: Complete two challenges totaling 21+ days

### Level 3 — Consistent

- Challenge length: 30, 50, or 66 days
- Pillars: 3–4 pillars
- Goals per pillar: 1–3 goals
- Experience: Self-directed, habit calendar, weekly check-up tool
- Unlock criteria: Complete one 60+ day challenge with 80%+ consistency

### Level 4 — Refiner

- Challenge length: 90 or 100 days
- Pillars: All 4 pillars
- Goals per pillar: 2–4 goals
- Experience: Goal quality refinement, stretch goals, cross-pillar insights, accountability partner
- Unlock criteria: Complete two 90+ day challenges across all four pillars

### Level 5 — Guide

- Challenge length: Any length
- Pillars: All 4 pillars, unlimited goals
- Experience: Create challenge templates, group challenges, coaching dashboard, legacy stats
- Unlock criteria: Earned through Level 4 completion + invitation

---

## Starter Level — Full Feature Specification

This is the most important level. If a user does not succeed here, they never see the rest of the app.

### Onboarding Flow (5 screens, runs once before first challenge)

1. **Welcome screen** — "Living on Purpose" vision statement. One compelling sentence before they set any goal.
2. **Pillar selection question** — "Which area of your life feels most neglected right now?" Answer pre-selects their first pillar.
3. **Duration vs. destination explainer** — The Rollercoaster Effect illustrated. Must appear before goal setup.
4. **ACT-guided goal setup** — App walks through A, C, T with plain questions. Pre-written goal suggestions are selectable and editable. No blank fields.
5. **Challenge start confirmation** — "Your 7-day challenge starts today." Emotional ceremony with challenge card display.

### Video Coaching Library (all videos ~60 seconds)

**Module A — Living on Purpose (the why)**
- A1: "Why your life feels like it's passing you by" — Day 0
- A2: "The difference between Living for, with, and on Purpose" — Day 0
- A3: "Why small habits are not small" — Day 1
- A4: "The five attacks against consistency" — Day 1

**Module B — The four pillars**
- B1: "Why your spiritual life is the foundation of everything else" — pillar intro
- B2: "Your body is not separate from your purpose" — pillar intro
- B3: "What you eat is what you become" — pillar intro
- B4: "You are more than your to-do list" — pillar intro

**Module C — Duration goals and the ACT system**
- C1: "Why destination goals keep failing you" — onboarding
- C2: "The one question that changes everything" — onboarding
- C3: "How to write a goal that actually works — the ACT test" — goal setup
- C4: "What to do when you miss a day" — recovery (most important video)

**Module D — Daily challenge coaching (one per day, Days 1–7)**
- D1: "Day 1: Let's go. Here's what today is about."
- D2: "Day 2: The awkwardness is normal — here's why."
- D3: "Day 3: The hardest day. Don't quit on day 3."
- D4: "Day 4: You made it through the hard part. Halfway there."
- D5: "Day 5: Notice anything yet? Here's what's forming."
- D6: "Day 6: One day left. Don't coast across the finish line."
- D7: "Day 7: You finished. Here's what that means."

### 7-Day Gamification System

- Visual 7-day challenge map with named milestones: Start, Adapt, Hard Day, Halfway, Notice, Almost, Done
- Streak visual that grows from Day 1 to Day 7
- Mid-challenge reward unlocks on Day 3 and Day 4
- Satisfying daily check-in animation (tap feels rewarding)
- Day 7 celebration: video + "Starter" badge + shareable completion card + Scripture card (Galatians 6:9)
- Missed-day recovery notification (grace tone, never shame)

### Notification System

| Notification | Time | Trigger |
|-------------|------|---------|
| Morning anchor | 7:00 AM | Daily, always |
| Evening check-in | 8:00 PM | Daily, if not checked in |
| Late rescue | 9:45 PM | If still not checked in |
| Streak at risk | 11:00 PM | Final warning before midnight |
| Day 1 completion | Immediate | After first check-in |
| Day 3 survival | Immediate | After Day 3 check-in |
| Day 4 halfway | Immediate | After Day 4 check-in |
| Day 7 celebration | Immediate | Full sequence on completion |
| Miss-day recovery | Morning after missed day | Grace tone, forward focus |

### Additional Starter Features

- "Why this matters to me" — one-sentence personal purpose statement written at setup, shown back on hard days
- Optional daily reflection field — one sentence, skippable
- Optional daily Scripture anchor — one verse per day, curated to the 7-day emotional journey
- Goal revision tool — one-tap goal adjustment (not abandonment) if goal proves unattainable
- Optional accountability person — one person who can see check-ins
- End-of-challenge summary — days completed, pillar performance, top reflection
- Level 2 invitation — warm handoff, not a prompt

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 14.2.29 |
| Language | TypeScript | 5.8.2 |
| Styling | Tailwind CSS | 3.4.17 |
| Auth | Clerk | 7.0.4 |
| Database | Supabase (PostgreSQL) | @supabase/supabase-js 2.49.4 |
| Hosting | Vercel | — |
| React | React + React DOM | 18.3.1 |

Router: App Router (Next.js 14, `/app` directory)

---

## Current Database Schema (Supabase)

### Existing Tables (do not modify structure — only add to)

**daily_entries** — Stores one row per user per day. All pillar data stored as JSONB.

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text — Clerk user ID |
| entry_date | date |
| spiritual | jsonb |
| activities | jsonb |
| sleep | numeric |
| weight | numeric |
| blood_pressure | text |
| nutritional | jsonb |
| personal | jsonb |
| physical_goals | jsonb |
| nutritional_log | jsonb |
| tiered_selections | jsonb |
| created_at, updated_at | timestamptz |

**user_config** — One row per user. Stores name, challenge start date, and duration.

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text, unique — Clerk user ID |
| name | text, default 'Champion' |
| start_date | date |
| duration | integer, default 100 |
| created_at, updated_at | timestamptz |

**user_goals** — One row per user. Stores all pillar goals as JSONB arrays.

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text, unique — Clerk user ID |
| spiritual | jsonb array |
| physical | jsonb array |
| exercise_types | jsonb array |
| stretching_types | jsonb array |
| nutritional | jsonb array |
| personal | jsonb array |
| updated_at | timestamptz |

**weekly_notes** — One row per user per week. Stores weekly reflection notes.

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| week_start | date |
| notes | text |
| updated_at | timestamptz |

### New Tables Required for v2 (to be added via migration)

**user_profile**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text, unique — Clerk user ID |
| current_level | integer, default 1 |
| onboarding_completed | boolean, default false |
| purpose_statement | text |
| selected_pillars | jsonb — array of pillar names |
| accountability_user_id | text, nullable |
| created_at, updated_at | timestamptz |

**challenges**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| level | integer |
| duration_days | integer |
| start_date | date |
| end_date | date |
| status | text — 'active', 'completed', 'abandoned' |
| pillar_goals | jsonb — snapshot of goals at challenge start |
| days_completed | integer, default 0 |
| consistency_pct | numeric, default 0 |
| created_at, updated_at | timestamptz |

**video_progress**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| video_id | text — e.g. 'A1', 'D3', 'C4' |
| watched_at | timestamptz |
| triggered_by | text — 'onboarding', 'day_1', 'day_3', etc. |

**daily_reflections**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| challenge_id | uuid, FK to challenges |
| day_number | integer |
| reflection_text | text |
| created_at | timestamptz |

**rewards**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| reward_type | text — 'starter_badge', 'day3_survival', 'halfway', 'day7_complete', etc. |
| challenge_id | uuid, FK to challenges, nullable |
| earned_at | timestamptz |

---

## App Route Structure

```
/app
  /dashboard        — main tracker view (existing)
  (future routes added here as v2 is built)
```

---

## GitHub Repository

- Repo: Ddaddy2980/DailyTracker
- URL: https://github.com/Ddaddy2980/DailyTracker
- Production branch: main
- Active development branch: v2-rebuild (create before starting)

---

## Current Users

App is in private testing with 2 users (David + 1 tester). Not yet open to the public.

---

*Last updated: March 2026*
*Maintained by: David / Altared Life, LLC*
