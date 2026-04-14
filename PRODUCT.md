# Daily Consistency Tracker — Product Reference Document

This file is the authoritative source of truth for this product. Read this file at the start of every Claude Code session before writing any code.

*Last updated: April 2026 — v3 rebuild. Per-pillar progression within a single user-chosen challenge container. Onboarding restructured: challenge length → clarity videos → Consistency Profile → goal setup. All level routing replaced by unified dashboard.*

---

## What This App Is

The Daily Consistency Tracker is a faith-integrated habit-formation web app built around a single premise: lifestyle changes that become lifestyle habits result in lifelong transformation. The app guides users through a progressive level system — from first-time habit builders to people who coach others — using a framework of duration goals (not destination goals) across five pillars of life.

The app meets users wherever they are. New users complete a Consistency Profile that assigns each pillar an independent starting level, honoring habits already built while investing coaching energy where genuine growth is needed. The ultimate destination is Soloing level in all five pillars — a life fully living on purpose.

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
- Every primary goal in this app is a duration goal. At Grooving level and above, users may optionally add destination goals to any pillar — short-term, time-bound personal challenges that give the habit a place to aim. Destination goals do not replace duration habits; they ride alongside them.

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

### The Five-Pillar Vision

The ultimate purpose of this app is to walk with every user until they reach Soloing level in all five pillars — until every area of their life is living on purpose. People do not build the five pillars at the same pace. This is not a character flaw — it is the normal, uneven reality of human development. The app honors where users are, builds on what they have already built, and steers them — gently and intentionally — toward wholeness across every pillar.

Every coaching decision, every steering mechanism, and every level advancement in the app points toward this horizon. The app does not say this as pressure. It says it as a promise: *this is where we are walking together.*

---

## The Five Pillars

The Spiritual pillar is the foundation on which all others rest. It shapes how users see themselves, treat others, and respond to adversity. The app presents this conviction with pastoral warmth — never as pressure, always as invitation.

The Relational pillar is the outward expression of all the others. Where the first four pillars build the person from the inside out, the Relational pillar channels that growth outward into the lives of others. A life that only receives never fully comes alive — like the Dead Sea, it receives the inflow of the Jordan River but has no outlet, and nothing lives in it. A life that gives as it grows — like the Sea of Galilee — teems with life precisely because it flows. The Relational pillar is that outlet.

Think about the month of December. Something shifts in people during the holidays — they become more generous, more present, more aware of the people around them. They hold doors, write notes, check on neighbors. Then January arrives and that posture quietly fades. The Relational pillar exists to keep that same intentionality alive the other eleven months of the year. The framework is Think ONE — Our Next Encounter. Every day is already full of people. The Think ONE posture trains a person to move through those encounters with intention rather than autopilot — approaching each day with four active orientations: Be Led by your awareness of who needs something today, Be Listening for what people around you are actually saying, Be Looking for the opportunity already in front of you, Be Loving with intention, not just sentiment. These Four B's are the foundation of every Relational duration goal.

---

## Visual Design System

**App Background**

Global background: `#EBEBEC` (light gray — used on all pages behind pillar cards and content)

**Pillar Color System**
Each pillar has four defined colors used consistently across all cards, modals, and UI elements:

| Pillar | Main Background | Title | Subtitle Text | Save Button |
|--------|----------------|-------|---------------|-------------|
| Spiritual | `#275578` | `#82B2DE` | `#608BAF` | `#376891` |
| Physical | `#202644` | `#8A96CD` | `#656E96` | `#2C345B` |
| Nutritional | `#B85D27` | `#F7B188` | `#D19675` | `#CC6930` |
| Personal | `#2E5144` | `#96CE95` | `#77A676` | `#3B6051` |
| Relational | `#317C80` | `#82C7CB` | `#6AA2A6` | `#3F9297` |

These hex values are the authoritative source. Do not substitute Tailwind color classes for pillar card backgrounds, titles, subtitle text, or save buttons — use the hex values directly via Tailwind's arbitrary value syntax (e.g. bg-[#275578]).

**Icons and Logo**

All icons are located in /public:

- App logo: logo_2.png
- Spiritual pillar: spiritual_icon.png
- Physical pillar: physical_icon.png
- Nutritional pillar: nutritional_icon.png
- Personal pillar: personal_icon.png
- Relational pillar: relational_icon.png

Reference icons using Next.js <Image> component with the / public path prefix (e.g. src="/spiritual_icon.png").

---

## The Consistency Profile

### Purpose

The Consistency Profile replaces the assumption that all new users begin at Level 1 (Tuning). It is a brief onboarding inventory — not a test — that evaluates each pillar independently and assigns a starting level per pillar before any goals are set. Users who skip the Profile default to Tuning (Level 1) for all pillars.

**Name:** "Your Consistency Profile"
**Sub-heading:** "Before we set anything up, let's look at where you already are."
**Opening line:** "This takes about 3–4 minutes. There are no right or wrong answers — only honest ones."

Do not use the words "test," "assessment," or "quiz." The user should feel seen and honored, not evaluated.

### Structure

Five questions per pillar — four standard dimensions plus one pillar-specific orientation question — twenty questions total. Questions are presented one pillar at a time in this order: Spiritual → Physical → Nutritional → Personal → Relational. Each question measures one of four dimensions:

| Dimension | What It Measures | Why It Matters |
|-----------|-----------------|---------------|
| Consistency | How often the practice currently happens | A habit that happens "sometimes" is a destination goal in disguise |
| Duration | How long it has been sustained | Longevity distinguishes a settled habit from a recent commitment |
| Independence | Whether it depends on external motivation or goals | Duration goals run on internal motivation — not outcomes |
| Resilience | What happens when life gets hard | The true test of a habit is whether it survives adversity |

### Question Sets by Pillar

Each pillar receives the same four questions with pillar-specific sub-text. All answer options are A (0 pts) through D (3 pts).

**Answer scale (applies to all questions):**

| Q1 — Consistency | Points |
|-----------------|--------|
| A) I don't really have a regular practice here | 0 |
| B) A few times a week when I think of it | 1 |
| C) Most days — I miss occasionally | 2 |
| D) Every day, almost without exception | 3 |

| Q2 — Duration | Points |
|--------------|--------|
| A) I'm just getting started or restarting | 0 |
| B) A few weeks | 1 |
| C) Several months | 2 |
| D) More than a year — and it has stayed consistent | 3 |

| Q3 — Independence | Points |
|------------------|--------|
| A) Yes — I need a goal, a challenge, or outside pressure to keep going | 0 |
| B) Sometimes — I slow down without a target | 1 |
| C) Rarely — it mostly runs on its own | 2 |
| D) Never — this is simply part of who I am | 3 |

| Q4 — Resilience | Points |
|----------------|--------|
| A) It disappears until things settle down | 0 |
| B) It takes a significant hit | 1 |
| C) It bends, but I bounce back within a few days | 2 |
| D) Almost nothing stops it — I find a way | 3 |

**Pillar-specific sub-text for each question:**

*🙏 Spiritual*
- Q1: "How often do you practice spiritual habits — prayer, Scripture, devotion, reflection — right now?"
- Q2: "How long have you maintained your current spiritual practice?"
- Q3: "Does your spiritual practice depend on a church season, a Bible reading plan, or external structure to keep going?"
- Q4: "When life gets hard — grief, stress, a spiritually dry season — what happens to your spiritual practice?"

*💪 Physical*
- Q1: "How consistently do you move your body with intention — exercise, walking, stretching — right now?"
- Q2: "How long have you maintained your current physical practice?"
- Q3: "Does your physical activity depend on a fitness goal, an event you're training for, or a program with an end date?"
- Q4: "When life gets hard — travel, illness, a brutal week — what happens to your physical practice?"

*🥗 Nutritional*
- Q1: "How consistently do you make intentional, health-supporting food and hydration choices right now?"
- Q2: "How long have you maintained your current nutritional habits?"
- Q3: "Do your nutritional habits depend on a specific diet, a program, or a season (like January or summer) to stay consistent?"
- Q4: "When life gets hard — travel, stress, social events — what happens to your nutritional habits?"

*📝 Personal*
- Q1: "How consistently do you invest in personal development — reading, writing, learning, emotional health, creative expression — right now?"
- Q2: "How long have you maintained your current personal development habits?"
- Q3: "Do your personal growth habits depend on a course, a reading challenge, or some other external structure to keep going?"
- Q4: "When life gets hard — busy seasons, emotional difficulty, family demands — what happens to your personal development habits?"

*🤝 Relational*
- Q1: "How consistently do you take intentional action to encourage, serve, or invest in someone outside your immediate family — right now?"
- Q2: "How long have you maintained a regular habit of being intentionally present and giving in your relationships?"
- Q3: "Does your investment in others depend on a scheduled event, an organized group, or an external commitment to keep you engaged?"
- Q4: "When life gets hard — busy seasons, personal difficulty, emotional drain — what happens to your intentional investment in the people around you?"

### Scoring Scale

Each pillar scores 0–12 points (4 questions × 0–3 pts each). Score maps to a starting level independently per pillar.

| Pillar Score | Starting Level | Level Name | What It Means |
|-------------|---------------|-----------|---------------|
| 0–3 | Level 1 | Tuning | Little or no consistent daily practice. Beginning from the foundation. |
| 4–6 | Level 2 | Jamming | Some consistency present but not yet automatic or resilient. Building on early habits. |
| 7–9 | Level 3 | Grooving | Real habits with staying power. Deepening what's already forming. |
| 10–12 | Level 4 | Soloing | A rooted, resilient daily practice. Maintaining, refining, and building from strength. |

Note: Level 5 (Orchestrating) is not assigned through the Consistency Profile. It is earned through demonstrated challenge completion history and invitation.

### The Pillar Portrait — Profile Output Screen

After all five pillar assessments are complete, the user sees the Pillar Portrait: a visual summary of their starting levels. This screen has three jobs — honor what they have built, name what is still developing, and invite them into the work ahead.

**Pillar Portrait screen elements:**
1. All five pillars displayed with their starting level name and a status phrase:
   - Soloing: "Rooted & Running"
   - Grooving: "Building Momentum"
   - Jamming: "Finding Your Rhythm"
   - Tuning: "Starting Fresh"
   - Relational (if Tuning): "Ready to Connect"
2. A brief personalized statement acknowledging strong pillars: *"You've built something real in [strong pillars]. That foundation matters — and we're going to build on it, not ignore it."*
3. A clear identification of the development focus: *"[Developing pillars] are your active growth areas. That's where your first challenge will invest the most energy."*
4. A single agency question: *"Which pillar do you most want to develop right now? You can always add others as you go."*

### The Spiritual Pillar — Special Pastoral Consideration

When a user places significantly lower in Spiritual than their other pillars, the app names this gently and specifically:

*"Your [Physical/Nutritional/Personal/Relational] habits are strong. The Spiritual pillar tends to be the one that holds everything else together. Even a small daily practice here can change what the other habits feel like."*

The Spiritual invitation language: *"You've built real discipline in [other pillars]. The Spiritual pillar works the same way — not through willpower, but through small, daily practices that, over time, reshape who you are from the inside out. Whatever your starting point, there is a habit here that will fit."*

The Spiritual pillar gauge on the Five-Pillar Dashboard always shows the gap honestly — the pillar card is visible, the level is named, and the invitation is present. The app does not hide the gap or soften it into invisibility. It simply names it with warmth rather than shame.

---

## Pillar Operating States

At any point in a challenge, each pillar exists in one of four operating states. These states determine coaching level, check-in intensity, and feature activation for that pillar.

| State | Assigned When | App Behavior | Check-In Experience |
|-------|--------------|-------------|-------------------|
| **Anchored** | Pillar at Soloing (Level 4) or Orchestrating (Level 5) | Maintenance mode. Goals tracked, no coaching videos. Light weekly check-in only. | Compact card, single tap to confirm. No sub-questions, no reflection prompt. |
| **Developing** | Pillar at Grooving (Level 3) or Jamming (Level 2) | Full framework active for this level. Coaching, pulse check, weekly reflection all engaged. | Full check-in card, each goal listed, optional reflection sentence. |
| **Building** | Pillar at Tuning (Level 1) | Full Tuning hand-holding: gamified map, daily videos, morning anchors, celebration sequences. | Prominent, celebratory card with gamified tap and streak visual. |
| **Dormant** | Pillar not yet selected or tracked | Shown on Five-Pillar Dashboard in muted state with quiet invitation: "This pillar is waiting." | Not included in any active challenge. |

### The Dashboard Pillar Card Behavior

Closed card state displays:

Pillar icon and name
Operating level (Tuning / Jamming / Grooving / Soloing / Orchestrating) — if pillar is dormant, show "Dormant"
Duration goal count only ("2 active goals" — duration goals only, never destination goals)
Consistency gauge
Down chevron indicating expandable

Open card state (tap to expand):

Duration goals listed first with checkboxes, visually prominent
Active destination goals listed below a subtle divider with independent checkboxes (only visible when card is open)
Save button at bottom of open card
Tapping Save commits all check-ins for this pillar and closes the card

There is no Edit button on the pillar card. Goal management (adding, editing, releasing duration goals and destination goals) is handled from the Goals tab.

### The Goals Page

The Goals page is accessible from the main navigation tab (not buried in settings). It is the only place users manage their goals mid-challenge. The dashboard pillar card is check-in only — no goal editing there.

**Layout:**
One card per active pillar, stacked vertically. Each card shows the pillar name, current level, and the user's current duration goals. Grooving+ cards also show destination goals below a visual divider.

**Adding a duration goal:**
Tapping "Add goal" opens an input row. The user types the goal text, then must confirm three ACT checkboxes before saving:
- **A — Attainable**: the goal is physically possible on any given day
- **C — Challenging**: the goal requires intentional effort
- **T — Trackable**: the user can clearly determine at end of day whether they did it or not

All three must be checked before the "Add Goal" button activates. The save cap for the user's current level is enforced — the "Add goal" button is hidden when the cap is reached.

**Goal suggestions:**
A collapsible suggestions list appears below the input. These are pre-written ACT-compliant suggestions for each pillar. Tapping a suggestion populates the text field and auto-checks the ACT boxes. The user can still edit the text after selecting.

**Removing a duration goal:**
A remove control appears next to each existing goal. Removing soft-deletes the goal (`is_active = false`) — the goal row is hidden from the UI but preserved in the database so rolling window history remains accurate. At least one duration goal must remain active for a pillar to stay active.

**Destination goals (Grooving and Soloing only):**
Below a visual divider: user can add, edit, or release destination goals. Release sets `status = 'released'` (not deleted). Cap enforced per level (3 for Grooving, unlimited for Soloing).

**Onboarding goal setup:**
During onboarding, all five pillars are shown. The user sets one duration goal per pillar they want to activate (or leaves it dormant). There is no ACT checklist in onboarding — goal entry is simpler. Destination goals are not available in onboarding. A note appears on any Grooving-level pillar: *"Destination goals can be added once you begin your journey."* All goals are saved as a batch when the user taps "Start My Challenge →" — no per-goal API calls during onboarding.

### The Unified Challenge Container

The app uses a single Unified Challenge Container for every user. One challenge, one dashboard, one daily check-in — with each pillar operating at its own level independently inside that container.

**Challenge duration is chosen by the user at onboarding** before the Consistency Profile. Available lengths: **21, 30, 60, 90, or 100 days**. This duration applies to the whole challenge. Pillar-level cycles (7-day Tuning windows, 14-day Jamming windows) run *within* the overall challenge container — they are internal progression mechanics, not user-visible challenge lengths.

**What the dashboard shows:**
"Day 4 of 60" — the current day of the overall challenge and the total length. Each pillar card shows its own level progression internally.

**Pillar levels are retained between challenges.** When a challenge ends, the user chooses a new duration and begins again. Pillar levels carry forward. The user may optionally retake the Consistency Profile at the start of a new challenge for reassessment.

**The 7-day Tuning cycle and 14-day Jamming cycle are internal windows**, not separate challenges. A person can be in a 60-day challenge with Physical still in Tuning on day 45 — the Tuning pillar card will show the current rolling 7-day window inside the card. There is no separate challenge start or completion for individual pillar level cycles.

### Daily Check-In Adaptation (Multi-Level Users)

- **Anchored pillars:** Full check-in card. Goal-by-goal confirmation. No coaching content.
- **Developing pillars:** Full check-in card. Goal-by-goal confirmation. Optional reflection sentence. Appropriate to the pillar's level.
- **Building pillars (Tuning):** Prominent, celebratory card with gamification and streak visual.

**Morning notification adapts to pillar mix:**
- Any Building (Tuning) pillar present: motivational day-specific tone referencing the Tuning milestone.
- All Developing pillars: coaching tone calibrated to the highest Developing pillar's level.
- All Anchored: reflective tone. *"Another day to build the life you've already been building."*

---

## The Steering Mechanism

The Steering Mechanism is the set of features that keeps the five-pillar vision in front of the user throughout their journey — guiding them toward Soloing in all five without pressure, shame, or abandonment of their strong pillars.

### The Five-Pillar Dashboard

Available from the beginning of every challenge. A primary navigation item — not buried in settings. Shows:
- Each pillar card with its current operating level (Tuning / Jamming / Grooving / Soloing / Orchestrating), and its Consistency Gauge
- Dormant pillars in muted state with quiet invitation: *"This pillar is waiting."*
- The Life on Purpose Score — only shown when all five pillars are active (see below)

### Per-Pillar Consistency Gauge

Each pillar card displays a visual gauge — not a letter grade, not a percentage out of 100, but a filling indicator that lives inside the pillar card alongside the level name. The gauge answers one question at a glance: *how consistently am I showing up for this pillar right now, compared to last week?*

**What the gauge measures:**
The gauge reflects two inputs combined into one score:
- **Weekly consistency performance** — how many days the user hit their duration goals within this pillar each week. This is the primary driver of movement.
- **Accumulated track record** — a rolling weighted average where recent weeks count more than older weeks, but long-term history provides cushion. A person on Day 60 who has a bad week absorbs it better than a person on Day 14 who has a bad week — their track record earns them buffer.

**How it moves:**
- A strong week pushes the gauge upward.
- A weak week pulls it downward.
- The longer the track record of good weeks, the more cushion against a hard one. The shorter the history, the more each week matters.
- The gauge moves in both directions. A person knows when they slacked, and the app does not pretend otherwise. The drop is not a punishment — it is an honest mirror and a challenge to respond this week.

**What the user sees on the pillar card:**
- The gauge filled to its current position
- A visible indicator of last week's position — so direction of movement is immediately apparent
- The current level name (Tuning / Jamming / Grooving / Soloing)
- No letter grades. No percentage-out-of-100 framing. The gauge is the score.

**Advancement threshold (rolling window):**
The Next Pillar Invitation only fires when a user meets a minimum completion threshold, evaluated against a rolling calendar window — not a single challenge boundary:
- Tuning (Level 1): 4 or more completions in the last 7 calendar days for that pillar
- Jamming (Level 2): 10 or more completions in the last 14 calendar days for that pillar
- Grooving (Level 3): threshold not yet defined — invitation deferred for this level
Logic lives in `lib/next-pillar-invitation.ts` as `meetsRollingWindowThreshold`. The field `next_pillar_invitation_pillar` is written as soon as the threshold is met on any check-in — not only at challenge completion. The UI surfaces it only at the completion moment.

**Pillar gauges are independent.** A person who hits all their Personal goals but misses four days in Nutritional will see their Personal gauge rise and their Nutritional gauge fall. There is no hiding a struggling pillar behind a strong one. Each pillar is accountable to itself.

**Gauge does not govern level advancement.** The gauge measures consistency health within a level. Level advancement is a separate milestone event governed by challenge completion criteria (see Level System). The gauge can be high but the level not yet advanced; the gauge can be recovering after a hard week while the level holds.

### The Life on Purpose Score

The Life on Purpose Score is the composite of all five pillar gauges — a single reading of whole-life consistency. It appears on the Five-Pillar Dashboard only when all five pillars are active.

**Until all five pillars are active:** The space where the composite score will appear shows a quiet invitation instead: *"Your Life on Purpose Score will appear when all five pillars are active."* This is not a penalty — it is a gentle pull toward whole-life engagement. Dormant pillars are named and invited, not ignored.

**Calculation:** Simple average of the five individual pillar gauge scores.

**The score moves with weekly performance** — just as the individual gauges do. A strong week across all pillars lifts the composite. A hard week in one pillar pulls it. The composite is an honest picture, not a flattering one.

**The score has no ceiling that reads like a grade.** It is displayed as a gauge, not a number. The language of the display is directional: the goal is not to hit 100 — it is to keep moving upward across every pillar.

### The Next Pillar Invitation

Fires after every challenge completion when any pillar is Dormant or significantly behind others.

**Triggers:**
- One or more pillars are Dormant (never started in the app)
- One pillar is two or more levels below the user's highest-level pillar
- User has been at the same level in a pillar for two or more consecutive challenges

**Language — Dormant pillar:**
*"You've built something real in Physical and Spiritual. But Nutritional has been sitting on the sideline. You don't have to attack it — just bring it into the fold. One small, sustainable goal. That's all it takes to get it started."*

**Language — Dormant Relational pillar (specific):**
*"Your other pillars are building strong. But the Relational pillar — investing intentionally in the lives of the people around you — hasn't started yet. You don't have to do something dramatic. Think ONE person. One daily habit of noticing, listening, or showing up. That's where it begins."*

**Language — significantly underdeveloped pillar:**
*"Your Spiritual and Physical pillars are rooted. Personal is building momentum. But Nutritional hasn't had the same attention. Your next challenge is a good time to change that. What's one thing you could do for your nutrition every single day?"*

**Implementation note:** The invitation only fires when the rolling window threshold for that level is met (see Consistency Gauge section). Level 3 (Grooving) is currently excluded from the trigger — `INVITATION_THRESHOLDS[3]` is undefined.

### The Monthly Pillar Check

Once every 30 days, one additional question is added to the weekly reflection flow, addressing the user's most underdeveloped or Dormant pillar. Not a separate screen — one question embedded in the existing weekly reflection. Cadence stored in `last_pillar_check_at` on user_profile.

Sample questions:
- *"You haven't started a Nutritional goal yet. Is there something in the way — or is this just not the right time?"*
- *"Personal is your most underdeveloped pillar. If you were to add one simple habit there, what would it be?"*
- *"You've been at Jamming in Spiritual for two challenges. What would it take to give it the same attention you give Physical?"*
- *"The Relational pillar hasn't started yet. Who is one person in your life right now that you could begin showing up for more intentionally?"*

### The Ceiling Conversation

When a user reaches Soloing in all five pillars, the app names it as the most significant moment in the user journey:

*"You've done something most people never do. Every area of your life is living on purpose. The question now isn't whether you can build these habits. It's whether you're willing to help someone else build theirs. That's what Orchestrating is for."*

---

## Level System — The Progression Architecture

Levels are **per-pillar**, not per-user. A user can be Grooving in Physical and Tuning in Spiritual at the same time. Each pillar progresses independently inside the single Unified Challenge Container.

The Consistency Profile assigns a starting level to each pillar at onboarding. Users who skip the Profile default to Tuning (Level 1) for all pillars.

Advancement is based on **rolling window completion thresholds** — not on completing a fixed challenge block. Past completions that fall outside the rolling window do not count. A person can remain at Tuning in a pillar for an entire 60-day challenge if they do not sustain 4 completions in any 7-day window.

### Rolling Window Advancement Thresholds

| From | To | Window | Required |
|------|----|--------|----------|
| Tuning (1) | Jamming (2) | Last 7 calendar days | 4 of 7 |
| Jamming (2) | Grooving (3) | Last 14 calendar days | 10 of 14 |
| Grooving (3) | Soloing (4) | Last 60 calendar days | 48 of 60 |

Advancement is evaluated on every pillar save and takes effect immediately when the threshold is met.

### Level 1 — Tuning

- **Internal cycle:** Rolling 7-day window tracked inside the pillar card
- **Duration goals for this pillar:** 1 goal (max)
- **Destination goals:** Not available
- **Experience:** Fully guided, hand-held, gamified. The focus is proving that daily consistency is possible — one pillar, one goal. The 7-day rolling window is visualized inside the pillar card as day-by-day marks. A daily coaching video is available inside the card based on position in the current window.
- **Advancement criteria:** 4 completions in any rolling 7-day window for this pillar
- **Key features:** 7-day rolling window visualization inside pillar card, daily video coaching per position, encouragement video when window stalls

### Level 2 — Jamming

- **Internal cycle:** Rolling 14-day window tracked inside the pillar card
- **Duration goals for this pillar:** 1–2 goals (max)
- **Destination goals:** Not available
- **Experience:** The focus is sustaining consistency over a longer window. The 14-day rolling progression is visualized inside the pillar card. Coaching videos available based on position.
- **Advancement criteria:** 10 completions in any rolling 14-day window for this pillar
- **Key features:** 14-day rolling window visualization inside pillar card, video coaching

### Level 3 — Grooving

- **Duration goals for this pillar:** 1–3 goals (max)
- **Destination goals:** Up to 3 per pillar
- **Experience:** The focus shifts from survival to formation. Duration goals are the foundation; destination goals sit on top as optional direction-setters. The pillar card displays duration goals and destination goals with independent checkboxes.
- **Advancement criteria:** 48 completions in any rolling 60-day window for this pillar
- **Key features:** Destination goals (up to 3), video coaching

### Level 4 — Soloing

- **Duration goals for this pillar:** 1–4 goals (max)
- **Destination goals:** Unlimited per pillar
- **Experience:** The habit is proven and rooted. Coaching shifts to stewardship — maintaining, refining, and building from strength.
- **Advancement criteria:** N/A — Soloing is the current ceiling level

### Level 5 — Orchestrating *(Future)*

- Not yet built. Earned through Level 4 completion + invitation.

---

## Onboarding Flow (v3)

Runs once for all new users. Sequence: commitment → foundation → self-knowledge → goal setup → begin.
Each step gates the next. Progress is stored in `user_profile` onboarding flags so users can resume if interrupted.

**Step 1 — Challenge Length** (`/onboarding/duration`)
The user chooses the total length of their challenge before anything else. This is a commitment moment — it anchors the whole journey. Available options: **21, 30, 60, 90, or 100 days**. Displayed as selectable cards. No explanation of per-pillar cycles needed here — the chosen number is simply "how long this challenge runs."

**Step 2 — Clarity Videos** (`/onboarding/videos`)
One screen with three video boxes. The user can watch in any order. Skippable but recommended. Each video is approximately 60 seconds.

- **Video 1 — Living on Purpose:** "Living on Purpose is the *how* of a life lived with meaning." Sets the tone before any goals are set.
- **Video 2 — Duration vs. Destination:** The Rollercoaster Effect explained. Why duration goals produce lifestyle change when destination goals produce the start-endure-arrive-return cycle. Conceptual foundation for everything else.
- **Video 3 — The Five Pillars:** The whole-life vision. Most people live strong in one area and neglected in others. This app walks with you toward wholeness across all five. Introduces Spiritual, Physical, Nutritional, Personal, and Relational with the river illustration (Sea of Galilee vs. Dead Sea) for the Relational pillar.

**Step 3 — Consistency Profile** (`/onboarding/profile`)
The full 20-question profile (5 pillars × 4 questions). One pillar at a time: Spiritual → Physical → Nutritional → Personal → Relational. Framing: *"Before we set up anything, let's look at where you already are."* The user feels seen, not evaluated. Scores are saved to `consistency_profile_sessions`. Pillar levels are written to `pillar_levels`.

**Step 4 — Pillar Portrait + Goal Setup** (`/onboarding/goals`)
Two parts on sequential screens:

*Part A — Pillar Portrait:* All five pillars displayed with their starting level name and a status phrase. A personalized statement honoring strong pillars. Development focus identified. The user is encouraged to activate all five pillars — each with one duration goal to start.

*Part B — Goal Setup (per pillar):* ACT-guided goal setup for each pillar the user activates. Pre-written goal suggestions are selectable and editable. The ACT check (Attainable, Challenging, Trackable) walks through one question per criterion. A pillar with no goal set remains Dormant. The app encourages activating all five but does not require it.

**Challenge Start Confirmation** (end of Step 4)
"Your challenge starts today." Shows the chosen duration ("Your 60-day challenge begins now"), all active pillars and their goals. Writes `challenges` row, sets `user_profile.active_challenge_id`, marks `onboarding_completed = true`. Redirects to `/dashboard`.

---

## Tuning Level — Pillar Card Feature Specification

This is the most important level to help the user find success. If a user does not show consistency here, they cannot advance.

### Video Coaching Library (all videos ~60 seconds)

**Module A — Living on Purpose (the why)**
- A1: "Why your life feels like it's passing you by" — Day 0
- A2: "The difference between Living for, with, and on Purpose" — Day 0
- A3: "Why small habits are not small" — Day 1
- A4: "The five attacks against consistency" — Day 1

**Module B — The five pillars**
- B1: "Why your spiritual life is the foundation of everything else" — pillar intro
- B2: "Your body is not separate from your purpose" — pillar intro
- B3: "What you eat is what you become" — pillar intro
- B4: "You are more than your to-do list" — pillar intro
- B5: "Think ONE — living intentionally for others" — Relational pillar intro. Introduces the Four B's (Be Led, Be Listening, Be Looking, Be Loving) and the Think ONE framework. Uses the Sea of Galilee / Dead Sea illustration.

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
- Day 7 celebration: video + "Tuning" badge + shareable completion card + Scripture card (Galatians 6:9)
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

### Additional Tuning Features

- "Why this matters to me" — one-sentence personal purpose statement written at setup, shown back on hard days
- Optional daily reflection field — one sentence, skippable
- Optional daily Scripture anchor — one verse per day, curated to the 7-day emotional journey
- Goal revision tool — one-tap goal adjustment (not abandonment) if goal proves unattainable
- Optional accountability person — one person who can see check-ins
- End-of-challenge summary — days completed, pillar performance, top reflection
- Level 2 invitation — warm handoff, not a prompt

---

## Jamming Level — Full Feature Specification

### The Core Coaching Message for Jamming

"It's supposed to feel harder before it feels easier. That's not failure — that's Jamming."

Two pillars is not twice as hard — it is four times as hard at first. The app must name this difficulty before the user experiences it, and return to it whenever the pulse check signals struggle.

### Tuning → Jamming Transition Experience (Path A users only)

Trigger: Fires when a Tuning challenge is marked complete and this pillar advances to Jamming.

1. Full Tuning completion celebration screen — Tuning badge, stats, Galatians 6:9 scripture card
2. Shareable completion card — "I just finished my Tuning challenge — 7 days, [pillar name], [app name]"
3. Rest day option — "Start Jamming today — or take a day to breathe." Invitation waits up to 3 days.
4. Jamming invitation card

Path B users (entering Jamming directly via Consistency Profile) do not see this transition. They receive a Jamming-entry welcome screen instead: *"You've already built consistency here. This 14-day challenge is about proving it holds — and going deeper."*

### Two Entry Paths into Jamming

**Path A — Via Tuning:** The user completed a 7-day Tuning challenge and has been invited into Jamming. Their 14-day Jamming challenge brings their total in-app journey to 21 days.

**Path B — Via Consistency Profile:** The user's Consistency Profile placed them at Jamming level in this pillar. Their 14-day Jamming challenge is their first challenge in the app for this pillar. The app acknowledges their prior consistency: *"You've already built something here. This challenge is about proving it holds over time."*

In both cases the Jamming challenge is 14 days. The onboarding tone and coaching content adapts slightly based on entry path — Path A users receive the Tuning→Jamming transition celebration; Path B users receive a Jamming-entry welcome that honors their existing habits without assuming beginner context.

### Jamming Onboarding Flow (3 screens)

1. **Challenge confirmation** — 14-day challenge. No length choice — Jamming is always 14 days.
2. **Goal setup / carry-forward review** — For Path A users: Tuning goal pre-populated; user confirms or adjusts, second pillar introduced. For Path B users: ACT-guided goal setup for this pillar at Jamming level; pre-written suggestions appropriate to Jamming experience.
3. **Accountability partner setup** — Name and contact (email or phone). Optional.

### Pulse Check System

Three states: Smooth Sailing, Rough Waters, Taking On Water.

Triggers: scheduled weekly, missed day, partial completion.

*Cooldown rule — CRITICAL* — Never show two pulse checks within 48 hours. Priority order: missed day trigger > partial completion trigger; scheduled weekly wins over both if same day. Smooth Sailing users never see an unscheduled pulse check.

### Jamming Challenge Map and Milestones

| Day | Name | Notes |
|-----|------|-------|
| 1 | Reentry | Welcome back. The Jamming load starts now. |
| 2 | Two Pillars | The new load is real. Acknowledge it. |
| 3 | Hard Again | "You knew this was coming." |
| 7 | Pulse Check 1 | Weekly summary + first pulse check. |
| 9 | Halfway | Reference prior challenge or Consistency Profile score. |
| 13 | Almost | Final push. One day left. |
| 14 | Done | Full Jamming completion sequence. |

### Video Coaching Library — Jamming Additions

**J Series — Core Jamming Videos**

| ID | Title | Trigger |
|----|-------|---------|
| J1 | "Welcome to Jamming. Here's what's different." | Jamming onboarding |
| J2 | "Why adding a second pillar feels like starting over (and why it's not)" | Day 1–2 |
| J3 | "The weekly check-in: why reviewing matters more than tracking" | Day 6 |
| J7 | "Jamming complete. You've built something real." | Jamming completion |

**Pulse Response Videos**

| ID | Title | Trigger |
|----|-------|---------|
| J4 | "What's forming in you right now" | Pulse = Smooth Sailing |
| J5 | "Still in it means you're winning" | Pulse = Rough Waters |
| J6 | "Let's make this survivable" | Pulse = Taking On Water |

### Notification System — Jamming (Adaptive by Pulse State)

| Notification | Time | Trigger condition |
|-------------|------|------------------|
| Morning anchor | 7:00 AM | All users daily |
| Evening check-in | 8:00 PM | Rough Waters + Taking On Water only |
| Mid-week encouragement | Wednesday | Rough Waters + Taking On Water only |
| Late rescue | 9:45 PM | Rough Waters + Taking On Water, if not checked in |
| Weekly check-in prompt | Day 7 / Day 14 | All users |
| Accountability partner update | Weekly | If partner set |
| Miss-day recovery | Morning after missed day | Grace tone always |
| Jamming completion | Immediate | Full sequence |

**`notification_tier` values:** `minimal` (Smooth Sailing), `standard` (Rough Waters), `full` (Taking On Water)

### Jamming Completion Sequence

1. Jamming badge awarded
2. Completion stats: days, pillars, consistency %, pulse check history
3. Shareable card
4. Grooving invitation

---

## Grooving Level — Full Feature Specification

### The Identity of This Level

Grooving is the first level where survival is no longer the question. The coaching register shifts entirely — from motivational to contemplative. The app is no longer saying "keep going, you can do this." It is saying "look at what is forming in you."

**The Core Coaching Message for Grooving:** "You are no longer building a habit. You are becoming a person who has these habits. That is a different thing entirely."

### How a User Enters Grooving

A user enters Grooving by one of two means:

1. **Via Consistency Profile** — Their profile score for this pillar places them at Level 3 at the start of their challenge. They begin in Grooving immediately.
2. **By completing Jamming** — Their rolling 14-day window for this pillar hits 10 of 14 completions. Advancement fires automatically on the next check-in save.

There is no separate Grooving challenge or onboarding flow. The user is already inside their unified challenge container. The pillar advances within that container.

### Jamming → Grooving Transition Experience

When a pillar advances from Jamming to Grooving mid-challenge:

- A welcome moment fires inside the dashboard acknowledging the advancement.
- The user is told they can now add **additional duration goals** (up to 3 for this pillar) and **destination goals** (up to 3 for this pillar).
- A short video explains what Grooving means and how destination goals work. *(Video content TBD — deferred until recording is complete.)*
- No challenge restart. No new challenge length selection. The existing challenge continues.

### The "Habit Taken Root" Milestone — Day 40–50

**Detection logic:**
- Runs silently after every check-in between Days 40 and 50
- Triggers when: user has completed their primary goal for 40+ consecutive or near-consecutive days (allowing up to 3 missed days in the window)
- Only fires once per challenge — first qualifying goal to hit the threshold

**Celebration sequence:**
1. Full-screen milestone moment
2. Message: "Something just happened. [Goal name] is no longer something you're trying to do. It's something you do."
3. "Rooted" badge awarded
4. Original "Why this matters to me" statement shown back
5. "What changed?" reflection from Jamming→Grooving transition shown back
6. Optional reflection prompt: "Now that this is part of who you are — what's next?"

**The transition into destination goals:**
- The "what's next?" question is the natural bridge. Immediately after the Rooted milestone, the app introduces destination goals. Destination goals are available from the start of Grooving level — they do not require the Rooted milestone to unlock. Framing: "You've built the how. Duration goals got you here. Now let's talk about where here can take you."  
- The 25/5 top five list is shown alongside this introduction.
- Destination goals are optional — they live alongside duration goals and do not replace them.

### Destination Goals (Grooving+)

Destination goals are optional, time-bound personal challenges attached to a pillar. They give the user a place to aim while the duration habit continues underneath. They are available at Grooving level and above and are a perk for users who have already proven consistency — they do not cause the Rollercoaster Effect because the duration habit is already established and remains primary.

A user running a 90-day Soloing challenge can add a destination goal mid-challenge (e.g., train for a 5K), pursue it for its window, and release it when finished. The duration habit underneath never changes.

**Availability and limits by level:**

| Level | Available | Destination Goal Limit per Pillar |
|-------|-----------|----------------------------------|
| Tuning (Level 1) | No | — |
| Jamming (Level 2) | No | — |
| Grooving (Level 3) | Yes | 3 |
| Soloing (Level 4) | Yes | Unlimited |
| Orchestrating (Level 5) | Yes | Unlimited |

Setup — accessed from the Goals tab only:

**Four fields:**

Goal name (plain-language description)
Frequency target (times per week, 2–7)
Time window (14–66 days)
Start date (defaults to today; end date calculated automatically: start date + window days)

Confirmation screen displays: "Your habit continues every day. This goal gives it a direction for the next [X] days."

**Daily check-in behavior:**

When a user taps open a pillar card on the dashboard, they see their duration goals first with checkboxes, followed by any active destination goals with their own independent checkboxes below a subtle divider. Each is checked separately. Hitting a destination goal on a given day does not automatically satisfy the duration goal. A user may check a destination goal without checking their duration goal and vice versa. Destination goals are only visible when the pillar card is open — they never appear in the closed card state.

**Consistency and metrics:**

Duration goals only count toward consistency percentage, streak, gauge score, pulse state, notification tier, and all challenge metrics. Destination goal completions are never factored into any of these. They exist as personal historical record only.

**Weekly reflection:**

Duration goal performance is shown first and prominently. Below it, each active destination goal shows hits vs. frequency target for the week (e.g., "Strength training: 2 of 3×"). Informational only. No coaching response or consequence for missing a destination target. Responses written to weekly_reflections.destination_goal_statuses.

**End states:**

| End State | Trigger | App Response |
|-----------|---------|-------------|
| Completed | User marks complete, or time window ends with consistent hits | Brief confirmation inside pillar card. Prompt to add a new destination goal if desired. Duration goal continues. |
| Released | User manually removes mid-challenge | Quiet removal. "Destination goal released. Your daily habit continues." Duration goal continues unchanged. |
| Expired | Time window ends without user action | Quiet expiry noted in weekly reflection. No consequence. Prompt: "That window has closed. Want to set a new one?" |

**Non-negotiable design rules:**

- Duration goals are always primary. Destination goals never appear in the closed card state.
- The closed pillar card "active goals" count reflects duration goals only.
- Missing a destination goal target carries zero consequence — no streak impact, no pulse change, no notification escalation, no shame language.
- Destination goals are optional. Their presence never implies obligation.
- When a destination goal ends, the duration habit continues without interruption.
- Language is always personal and directional: "aiming toward," "moving toward," "personal challenge." Never "failed," "missed target," "behind."

### Deeper Weekly Reflection — Grooving Format

**The core coaching conviction of the Grooving weekly check:**
Duration goal consistency is always more important than destination goal performance. The weekly reflection must reinforce this clearly and repeatedly. A person who completed their duration goal every day but missed their destination goal target is succeeding. A person who hit their destination target but only completed their duration goal four of seven days is drifting — and the app names this gently. The destination goal gives the duration habit direction. It does not replace it. If those two things ever compete, the duration habit wins.

**Weekly reflection structure (every 7 days):**
1. Habit calendar summary — visual week review
2. Pillar performance — days completed per pillar, comparison to previous week. Duration goal completion is shown first and prominently. Destination goal status is shown below it as secondary context.
3. One reflection question — rotates weekly from curated set
4. Pulse check — same three-state question, same adaptive response logic
5. Destination goal check-in (for each active destination goal, if any) — "Are you on track with [goal name]? [hits] of [target]× this week" (informational only — does not affect pulse state, notification tier, or challenge status)
6. Monthly Pillar Check question *(if 30-day cadence has elapsed)*

**If a user hits their destination goal but misses duration goal days:**
The app addresses this directly with a coaching note — not shame, but clarity: *"You hit your [destination] target this week — that's real. And you completed your daily habit [X] of 7 days. The daily habit is what makes [destination] stick long-term. This week, let's focus on the daily practice first."*

**If a user hits duration goals but misses destination target:**
The app affirms the right priority: *"You showed up [X] of 7 days for [pillar]. That's what this is about. Your [destination] goal is still in front of you — and the habit you're building is exactly what makes it reachable."*

**Rotating weekly reflection questions (library of 10):**
- "Which pillar felt most alive this week — and why do you think that is?"
- "What was the hardest moment this week, and what got you through it?"
- "Is there anything about your goals that needs to change to stay honest?"
- "What would the person you were six months ago think about who you are becoming?"
- "Which of your 25/5 top five felt closest this week?"
- "Where did the Tyranny of the Urgent win this week — and what would you do differently?"
- "Is your pace sustainable? What needs to be adjusted to protect that?"
- "What habit feels most automatic now? What still requires intentional effort?"
- "Who in your life has noticed something different about you? What did they see?"
- "If your habits are building something — what is it building toward?"

### The Grooving Circle — Community Witness Feature

A small, private group of up to 5 people who receive a weekly digest of the user's consistency. Not a social feed. A witnessed practice.

**What Circle members receive (weekly, automated):**
- "[Name] completed [X] of [Y] days this week across [pillar count] pillars"
- Current streak length
- One sentence from weekly reflection (optional — user chooses each week)

**What Circle members can do:** Reply with a brief encouragement (text notification to user only). Nothing else.

**Circle management:** User adds members by name and contact (email or phone). Members do not need an app account.

### Life Interruption Recovery System

**Challenge pause feature:**
- Pause for up to 14 days. Extends challenge end date. Streak preserved.
- Reason required: Travel, Illness, Family, Work, Other. One use per challenge.
- Grooving Circle receives: "[Name] has paused their challenge. They'll be back soon."

**Return from pause:** "Welcome back. [X] days paused. Your challenge continues where you left off." Day 1 back is treated as a milestone.

### Video Coaching Library — Grooving Additions

**G Series — Core Grooving Videos**

| ID | Title | Trigger |
|----|-------|---------|
| G1 | "Welcome to Grooving. The question changes here." | Grooving onboarding |
| G2 | "Why the 25/5 exercise will change how you see your time" | 25/5 screen |
| G3 | "What the habit calendar is really showing you" | First calendar open |
| G4 | "The people who finish are the people who feel witnessed" | Grooving Circle setup |
| G5 | "Something just happened — your habit has taken root" | Rooted milestone |
| G6 | "From how to where — introducing destination goals" | Post-Rooted, destination goal introduction. Tone: expansive, not prescriptive. References 25/5 top five if completed. |
| G6b | "Setting a direction within your daily habit" | When user first adds a destination goal from the Goals tab. Tone: practical and grounding. |
| G7 | "What to do when life interrupts your challenge" | Challenge pause activation |
| G-Return | "Welcome back. You didn't quit — you paused." | Return from pause |
| G8 | "Grooving complete. Look at what you've built." | Grooving completion |

**Pulse response videos**

| ID | Title | Trigger |
|----|-------|---------|
| G-Smooth | "You're in the groove. Notice what that feels like." | Pulse = Smooth Sailing |
| G-Rough | "Long challenges have hard weeks. This is one of them." | Pulse = Rough Waters |
| G-Water | "Let's figure out what this challenge needs to look like for you to finish it." | Pulse = Taking On Water |

### Notification System — Grooving

| Notification | Time | Trigger condition |
|-------------|------|-------------------|
| Morning anchor | 7:00 AM | All users daily — reflective tone |
| Evening check-in | 8:00 PM | Rough Waters + Taking On Water only |
| Weekly reflection prompt | Day 7, 14, 21… | All users |
| Habit calendar insight | When pattern detected | "You've missed [day] three weeks running." |
| Rooted milestone alert | Day 40–50 trigger | "[Goal] has taken root. Open the app." |
| Destination goal check-in | Weekly, if set | Included in weekly reflection flow |
| Destination goal expiry reminder | Weekly | In weekly reflection if sub-destination window is within 7 days of expiry. Not a standalone push. |
| Grooving Circle digest send | Weekly | Automated to Circle members |
| Life interruption pause confirmation | On pause activation | "Challenge paused. Streak is safe." |
| Return from pause | On return | "Welcome back. Day [X] of [total] continues now." |
| Grooving completion | Immediate | Full completion sequence |

### Grooving Completion Sequence

1. Grooving badge awarded
2. Full stats: total days, pillars, consistency %, Rooted milestone date, habit calendar summary, 25/5 top five shown
3. "What changed?" reflection shown back
4. Destination goal status (if set): "You set out to move toward [goal]. Are you closer? Yes / Somewhat / Not yet"
5. Shareable card
6. Soloing invitation

---

## Groups

### Purpose

Groups are an accountability feature, not a competition tool. Every group is built on the assumption that its members already know each other and have chosen to walk through their challenge together. The app does not rank members, display streak counts, or surface comparative data. It shows only one thing per member per day: whether they checked in.

The core question the group answers every day is simple: *"Did everyone show up today?"* Nothing more. The moment the feature feels like comparison it stops feeling like community. Every design decision — what to show, what to hide, what language to use — must preserve this distinction.

### Availability

- Available at all levels: Tuning, Jamming, Grooving, Soloing
- Any user can create a group or join one from Day 1
- Group membership is independent of challenge or level status

### Group Structure

- A user can create a group and invite others by sharing an invite code
- Maximum 10 members per group (including the creator), enforced at join time
- A user can belong to multiple groups
- Groups have a name, an invite code, and a status: `active`, `paused`, or `archived`

### Invite Code

Each group is assigned a unique 5-character alphanumeric invite code at creation time (e.g. `A3K9M`), generated app-side. The creator can share the code directly or use the "Share invite link" button to send a deep link. The invite link can be toggled on or off — when off, the code no longer accepts new members. Codes do not expire.

**Deep-link format:** `[app-domain]/join/[invite_code]`

### Daily Check-In Indicator

Each group member is shown with a circle next to their name:
- **Empty circle** — no check-in recorded yet today
- **Green circle** — member has completed a check-in on any pillar today

This is the only activity signal shown — no pillar breakdown, no goal details, no streak data, no partial state. The group sees that you showed up — not what you committed to or how much you did.

### Display Names

A member's display name in the group is their full name from Clerk sign-up (first + last name). No separate display name entry is required when joining or creating a group. Display name is captured at join time and is not live-synced.

### Data Model

**consistency_groups**
```
id (uuid, PK)
user_id (text) — Clerk user_id of creator (owner)
name (text) — group name set by creator
invite_code (text, unique) — 5-char alphanumeric e.g. 'A3K9M', generated app-side
max_members (integer, default 10)
status (text) — 'active' | 'paused' | 'archived'
created_at (timestamptz)
```

**group_members**
```
id (uuid, PK)
group_id (uuid, FK → consistency_groups)
user_id (text) — Clerk user_id
display_name (text) — full name from Clerk, captured at join time
joined_at (timestamptz)
is_active (boolean, default true) — false when member leaves or is removed
unique: (group_id, user_id)
```

**group_daily_status**
```
id (uuid, PK)
group_id (uuid, FK → consistency_groups)
user_id (text)
status_date (date)
completed (boolean) — true when member has checked any pillar today
unique: (group_id, user_id, status_date)
```

**Why group_daily_status exists**: Rather than querying every member's pillar_daily_entries in real time when the group view opens, a lightweight status row is upserted each time a member checks in. The group card becomes a single fast query rather than N joins across N members' data.

**Write timing**: `group_daily_status` is upserted from `/api/checkin` on every today's pillar save. Past-day retroactive edits do not update group status.

### Group Dashboard — Layout and Display

**Access**: Groups tab in the main bottom navigation. Available to all users.

**Empty state (not in any group)**
*"You're not in a Consistency Group yet. Groups are small — up to 10 people — and private. Everyone sees a simple circle each day. Nothing more."*
Two options: "Create a group" and "Join a group with a code."

**Group card (one per group)**
- Group name + invite code with copy button + member count
- One row per member: display name (left) + check-in circle (right)
- Current user's row always appears first
- All other members in alphabetical order by display name
- No sorting by completion or any performance metric — ever

**Single-member state**
*"Waiting for others to join. Share your group code: [CODE]"* — show code prominently with copy and share buttons.

**End of day, no one checked in**
No shaming language. Show empty circles with a quiet note: *"Tomorrow is a new day."*

**Member leaves**
Their row disappears from the group view immediately. No announcement to the group.

### Privacy Boundaries — Non-Negotiable

**Members CAN see about each other:**
- Display name
- Whether they checked in today (green circle / empty circle)

**Members CANNOT see about each other:**
- Goal text or goal content of any kind
- Which pillars were checked
- Current level
- Consistency percentage or streak count
- Challenge day number
- Any historical data beyond today's status
- Pulse check state or reflection answers

### Group Management

**Creator permissions**
- Rename the group
- Toggle the invite link on or off
- Pause the group — freezes the group in place; members are not removed; check-in syncing stops while paused
- Remove a member (`is_active = false` — removed member is not notified in-app)
- Delete the group — removes the group and all membership records permanently

**Member permissions**
- Leave the group (`is_active = false` on their own membership row)
- Cannot remove other members or rename the group

**Multi-group membership**
- A user can belong to multiple groups
- `group_daily_status` is upserted for all groups the user belongs to on each check-in

### Notifications for Groups

| Notification | Trigger | Tone |
|---|---|---|
| Someone joined your group | New member joins | Celebratory — "[Name] just joined [Group name]" |
| Your group is checking in | 8:00 PM if user has not checked in AND at least one member has | Gentle — "[X] people in [Group name] have checked in today. Still time to join them." |
| Full group day | All members complete on same day | Celebratory — "Everyone in [Group name] showed up today. That's a full group day." |

The 8:00 PM group nudge only fires if the user has not already received an evening check-in notification from the standard notification system. No duplicate notifications.

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

**daily_entries** — One row per user per day. All pillar data stored as JSONB.

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

**user_config** — One row per user.

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text, unique |
| name | text, default 'Champion' |
| start_date | date |
| duration | integer, default 100 |
| created_at, updated_at | timestamptz |

**user_goals** — One row per user. All pillar goals as JSONB arrays.

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text, unique |
| spiritual | jsonb array |
| physical | jsonb array |
| exercise_types | jsonb array |
| stretching_types | jsonb array |
| nutritional | jsonb array |
| personal | jsonb array |
| updated_at | timestamptz |

**weekly_notes** — One row per user per week.

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| week_start | date |
| notes | text |
| updated_at | timestamptz |

---

### New Tables Required for v2 (add via migration)

**user_profile**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text, unique |
| current_level | integer, default 1 — *deprecated; run in parallel with pillar_levels during migration* |
| onboarding_completed | boolean, default false |
| purpose_statement | text |
| selected_pillars | jsonb |
| accountability_user_id | text, nullable |
| notification_tier | text, default 'standard' — 'minimal' \| 'standard' \| 'full' |
| last_pulse_check_at | timestamptz, nullable |
| accountability_partner_name | text, nullable |
| accountability_partner_contact | text, nullable |
| focus_list_25 | jsonb, nullable |
| focus_top_5 | jsonb, nullable — always `FocusTop5Item[] \| null` with `{ rank, text }` format |
| what_changed_reflection | text, nullable |
| rooted_milestone_fired | boolean, default false |
| rooted_milestone_date | date, nullable |
| rooted_goal_id | text, nullable |
| consistency_profile_completed | boolean, default false |
| life_on_purpose_score | integer, nullable — composite of all five pillar gauge scores; only calculated and displayed when all five pillars are active |
| next_pillar_invitation_pillar | text, nullable — cleared after user responds |
| last_pillar_check_at | timestamptz, nullable — enforces 30-day Monthly Pillar Check cadence |
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
| status | text — 'active' \| 'completed' \| 'abandoned' |
| pillar_goals | jsonb — snapshot of goals at challenge start |
| pillar_level_snapshot | jsonb, nullable — each pillar's level and operating_state at challenge start. Example: `{ "spiritual": { "level": 5, "state": "anchored" }, "physical": { "level": 4, "state": "anchored" }, "nutritional": { "level": 3, "state": "developing" }, "personal": { "level": 3, "state": "developing" } }` |
| days_completed | integer, default 0 |
| consistency_pct | numeric, default 0 |
| created_at, updated_at | timestamptz |

**video_progress**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| video_id | text — e.g. 'A1', 'G6b' |
| watched_at | timestamptz |
| triggered_by | text |

**daily_reflections**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| challenge_id | uuid, FK → challenges |
| day_number | integer |
| reflection_text | text |
| created_at | timestamptz |

**rewards**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| reward_type | text — 'tuning_badge' \| 'day3_survival' \| 'halfway' \| 'day7_complete' \| 'rooted' \| etc. |
| challenge_id | uuid, FK → challenges, nullable |
| earned_at | timestamptz |

**pulse_checks**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| challenge_id | uuid, FK → challenges |
| week_number | integer |
| pulse_state | text — 'smooth_sailing' \| 'rough_waters' \| 'taking_on_water' |
| trigger_type | text — 'scheduled_weekly' \| 'missed_day' \| 'partial_completion' |
| recorded_at | timestamptz |

**grooving_circle_members**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| member_name | text |
| member_contact | text — email or phone |
| added_at | timestamptz |
| active | boolean, default true |

**destination_goals** — Pillar-level destination goals (Grooving+)

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| challenge_id | uuid, FK → challenges |
| pillar | text — 'spiritual' \| 'physical' \| 'nutritional' \| 'personal' |
| goal_name | text |
| target_date | date, nullable |
| focus_item_rank | integer, nullable — links to 25/5 top five (1–5) |
| status | text, default 'active' — 'active' \| 'reached' \| 'released' |
| created_at, updated_at | timestamptz |

**weekly_reflections**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| challenge_id | uuid, FK → challenges |
| week_number | integer |
| reflection_question | text |
| reflection_answer | text, nullable |
| destination_goal_status | text, nullable — 'yes' \| 'slowly' \| 'no' |
| destination_goal_statuses | jsonb, nullable — array: `[{ "destination_goal_id": "uuid", "hits_this_week": integer, "frequency_target": integer }]` |
| share_with_circle | boolean, default false |
| created_at | timestamptz |

Note for Claude Code: Rename column sub_destination_statuses → destination_goal_statuses in Supabase migration before Phase 5 build begins if the column already exists.

**challenge_pauses**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| challenge_id | uuid, FK → challenges |
| pause_reason | text — 'travel' \| 'illness' \| 'family' \| 'work' \| 'other' |
| paused_at | timestamptz |
| resumed_at | timestamptz, nullable |
| days_paused | integer, nullable |

**pillar_levels** — Per-pillar level tracking. Replaces single current_level in user_profile.

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| pillar | text — 'spiritual' \| 'physical' \| 'nutritional' \| 'personal' \| 'relational' |
| level | integer, default 1 — 1 (Tuning) through 5 (Orchestrating) |
| operating_state | text, default 'building' — 'anchored' \| 'developing' \| 'building' \| 'dormant' |
| profile_score | integer, nullable — Consistency Profile score (0–12) for this pillar. Null if user skipped Profile. |
| gauge_score | integer, nullable — current Consistency Gauge score for this pillar. Recalculated weekly. Null until first week closes. |
| assessed_at | timestamptz, nullable |
| updated_at | timestamptz |

**consistency_profile_sessions** — One row per completed Profile session.

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| spiritual_score | integer — 0–12 |
| physical_score | integer — 0–12 |
| nutritional_score | integer — 0–12 |
| personal_score | integer — 0–12 |
| relational_score | integer — 0–12 |
| focus_pillar_selected | text, nullable — pillar user selected as development focus |
| completed_at | timestamptz |

duration_goal_destinations — Destination goals attached to a pillar (Grooving+)

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| challenge_id | uuid, FK → challenges |
| pillar | text — 'spiritual' \| 'physical' \| 'nutritional' \| 'personal' \| 'relational' |
| goal_name | text |
| frequency_target | integer — times per week (2–7) |
| frequency_unit | text, default 'weekly' |
| window_days | integer — 14–66 |
| start_date | date |
| end_date | date — calculated: start_date + window_days |
| status | text, default 'active' — 'active' \| 'completed' \| 'released' \| 'expired' |
| created_at | timestamptz |
| updated_at | timestamptz |

Removed from prior spec: duration_goal_ref (destination goals are now pillar-level, not attached to a specific duration goal), direction_name (renamed to goal_name).

Migration note for Claude Code: Confirm whether duration_goal_destinations was already created in Supabase during the Step 31 migration. If yes, a migration is required before Phase 5 build begins: drop duration_goal_ref, rename direction_name to goal_name. If the table has not yet been created, build it fresh from this schema.

**consistency_groups** — See Consistency Groups section for full feature spec.

| Column | Type |
|--------|------|
| id | uuid, PK |
| name | text — group name, max 30 characters |
| created_by | text — Clerk user_id of creator |
| invite_code | text, unique — format `[WORD]-[4CHARS]` e.g. `RIVER-4K2M` |
| invite_url_enabled | boolean, default true |
| max_members | integer, default 12 |
| created_at | timestamptz |
| active | boolean, default true |

**group_members**

| Column | Type |
|--------|------|
| id | uuid, PK |
| group_id | uuid, FK → consistency_groups |
| user_id | text — Clerk user_id |
| display_name | text — snapshot from user_profile.name at join time |
| joined_at | timestamptz |
| active | boolean, default true — false when member leaves or is removed |

**group_daily_status** — Written by `submitCheckin` for every group the user belongs to.

| Column | Type |
|--------|------|
| id | uuid, PK |
| group_id | uuid, FK → consistency_groups |
| user_id | text |
| status_date | date |
| completion_status | text — `'full'` \| `'partial'` \| `'none'` |
| streak_count | integer |
| active_pillars | text[] — pillar names currently tracked by this user |
| updated_at | timestamptz |
| *constraint* | unique (group_id, user_id, status_date) |

**Write pattern for group_daily_status in `submitCheckin`:**
1. Fetch all group_ids where this user_id has an active group_members row
2. For each group_id, upsert group_daily_status for today
3. completion_status: `'full'` if all active pillars complete, `'partial'` if some
4. Write current streak_count and active_pillars from current challenge
5. Must not block check-in save — use Promise.all or fire-and-forget; group status write must never cause a check-in to fail

---

## App Route Structure

```
/app
  /dashboard          — main tracker view (existing); pillar cards adapted per operating state
  /profile            — Five-Pillar Dashboard with per-pillar Consistency Gauges and Life on Purpose Score (when all five pillars active)
  /consistency-profile — Onboarding assessment flow (new users)
  /onboarding         — Level 1 onboarding flow
  /challenge          — active challenge view
  /api                — API routes
```

**Component-level changes (no new routes):**
- Pillar card: expand/collapse interaction, duration goal checkboxes, destination goal checkboxes when open, Save button
- Weekly reflection: updated to include destination goal progress and Monthly Pillar Check
- Destination goal setup: accessed from Goals tab only — not a modal from the goal card
- Daily check-in: pillar cards adapt rendering based on operating state (Anchored / Developing / Building)

---

## GitHub Repository

- Repo: Ddaddy2980/DailyTracker
- URL: https://github.com/Ddaddy2980/DailyTracker
- Production branch: main
- Active development branch: v2-rebuild

---

## Current Users

App is in private testing with David only. Fresh start — existing data wiped and replaced with new v2 schema.

---

*Last updated: April 2026*
*Maintained by: David / Altared Life, LLC*
*Last updated: April 2026*
*v2 additions: Consistency Profile, Pillar-by-Pillar Architecture, Steering Mechanism, Destination Goals (Phase 5 complete)*

