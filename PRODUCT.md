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

### Level 1 — Tuning

- Challenge length: 7 days
- Pillars: 1–2 pillars only
- Goals per pillar: 1 goal
- Experience: Fully guided, hand-held, gamified
- Unlock criteria: Complete one 7-day challenge
- Key features: Onboarding flow, video coaching library, gamified 7-day map, daily notifications, celebration sequence

### Level 2 — Jamming

- Challenge length: 14 or 21 days (user chooses at setup)
- Pillars: 2–3 pillars
- Goals per pillar: 1–2 goals
- Experience: Daily coaching videos (peer tone, not instructional), weekly check-in replaces most daily touchpoints, adaptive pulse check system, accountability partner introduced
- Unlock criteria: Complete one 7-day Tuning challenge
- Key features: Tuning→Jamming celebration and transition, lighter onboarding, adaptive pulse check system, accountability partner, weekly summary view, pulse-responsive notifications and videos

### Level 3 — Grooving

- Challenge length: 30, 50, or 66 days (user chooses at setup)
- Pillars: 3–4 pillars (full access for the first time)
- Goals per pillar: 1–3 goals
- Experience: Contemplative coaching tone (not motivational), habit calendar, "habit taken root" celebration at Day 40–50, destination goal introduction, 25/5 focus exercise, deeper weekly reflection, cross-pillar visibility, community witness features
- Unlock criteria: Complete two Jamming challenges totaling 21+ days
- Key features: Full four-pillar access, 66-day challenge option, habit calendar, habit formation milestone celebration, destination goal layer, 25/5 exercise, Grooving Circle (community witness), deeper weekly reflection replacing pulse check as primary touchpoint

### Level 4 — Soloing

- Challenge length: 90 or 100 days
- Pillars: All 4 pillars
- Goals per pillar: 2–4 goals
- Experience: Goal quality refinement, stretch goals, cross-pillar insights, accountability partner
- Unlock criteria: Complete two 90+ day challenges across all four pillars

### Level 5 — Orchestrating

- Challenge length: Any length
- Pillars: All 4 pillars, unlimited goals
- Experience: Create challenge templates, group challenges, coaching dashboard, legacy stats
- Unlock criteria: Earned through Level 4 completion + invitation

---

## Tuning Level — Full Feature Specification

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

This is the bridge level. The person has proven they can show up for 7 days. Now they must prove they can carry two pillars over a longer haul — and learn to recognize and name how they are doing mid-challenge.

### The Core Coaching Message for Jamming

"It's supposed to feel harder before it feels easier. That's not failure — that's Jamming."

Two pillars is not twice as hard — it is four times as hard at first. The app must name this difficulty before the user experiences it, and return to it whenever the pulse check signals struggle.

### Tuning → Jamming Transition Experience

Trigger: Fires immediately when a Tuning challenge is marked complete.

1. **Full Tuning completion celebration screen**
   - Tuning badge displayed prominently
   - Stats: 7 days completed, pillar(s), consistency percentage
   - Galatians 6:9 scripture card
   - Tone: "You did something most people never do."

2. **Shareable completion card**
   - "I just finished my Tuning challenge — 7 days, [pillar name], [app name]"
   - One-tap share to social or text
   - Word-of-mouth acquisition built into the celebration moment

3. **Rest day option**
   - "Start Jamming today — or take a day to breathe."
   - Jamming invitation waits up to 3 days before a gentle nudge appears
   - Do not force an immediate start; giving the choice respects the accomplishment

4. **Jamming invitation card**
   - "You've tuned your instrument. Now it's time to play."
   - Brief description of what Jamming is and what's different
   - Challenge length choice presented here: 14 days or 21 days
   - "14 days if you want to build confidence. 21 days if you're ready to push."

5. **Carry-forward of Tuning goal**
   - Tuning goal pre-populated as first Jamming goal
   - User confirms or adjusts — does not rebuild from scratch
   - Honors what was already built

### Jamming Onboarding Flow (3 screens — lighter than Tuning)

**Screen 1 — Challenge length choice**
- Present 14-day and 21-day options with honest framing
- Brief explanation of what each length does for habit formation
- No right or wrong answer — both are wins

**Screen 2 — Second pillar introduction**
- App suggests the next pillar based on what was NOT chosen in Tuning
- One-sentence explanation of why this pillar matters
- ACT check is lighter: one question only ("Can you do this on the worst day of the year?") — not the full three-step walk-through
- Pre-written goal suggestions are still available and selectable

**Screen 3 — The honest warning**
- "Two pillars is harder than one. It's supposed to feel harder before it feels easier."
- Names the difficulty before it arrives — the most important coaching moment in Jamming onboarding
- Introduces the pulse check: "Once a week we'll ask how you're doing. Your answer adjusts how we support you."

**Accountability partner invitation** (optional — presented on Screen 3)
- "Who in your life would celebrate this with you?"
- One person: name + contact (email or phone)
- Partner visibility: weekly summary only — not daily check-ins
- Introduced here for the first time; not available in Tuning

**Updated purpose statement**
- Show the user what they wrote in Tuning
- "Does this still capture your why? Update it or keep it."
- Their own words shown back to them on hard days

### Pulse Check System — Adaptive Coaching

The pulse check is the most innovative feature in the app. It replaces fixed support levels with a responsive system that meets each user where they actually are each week.

**Three Pulse States**

| State | User says | App response |
|-------|-----------|--------------|
| Smooth Sailing | "I've got this. Habits are forming." | Reduce to morning anchor notification only. Surface encouragement video (J4). Back off coaching tone. |
| Rough Waters | "It's hard but I'm still in it." | Maintain standard support. Surface relevant recovery video (J5). Add mid-week encouragement message. |
| Taking On Water | "I'm struggling and close to quitting." | Escalate to full Tuning-level notification cadence. Surface J6 + C4. Offer goal revision. Offer temporary pillar reduction. Personal-feeling message. |

**Pulse Check Cadence — Hybrid Model**

The cadence is intelligent, not fixed. Default is weekly. Event triggers fire additional checks when warning signals appear.

*Scheduled weekly check (every 7 days)*
- Anchored to the weekly summary view
- Full context available: days completed per pillar, reflection field, pulse question
- The primary pastoral moment of the week

*Event trigger 1 — Missed day*
- Fires the next time the user opens the app after any missed check-in
- Single question only — no weekly summary attached
- Prompt: "Yesterday slipped. How are you feeling about the challenge right now?"
- Catches the slide at the exact moment it is most actionable

*Event trigger 2 — Two consecutive partial completions*
- Fires on Day 3 of the pattern if the user completed only part of their goals on Days 1 and 2
- Lightweight — the three-state pulse question only, no full weekly summary
- Early warning before the pattern becomes a dropout

*Cooldown rule — CRITICAL*
- Never show two pulse checks within 48 hours, even if multiple triggers fire simultaneously
- Priority order: missed day trigger wins over partial completion trigger; scheduled weekly wins over both if same day
- Users who are Smooth Sailing never see an unscheduled pulse check

**Pulse Check Decision Logic**

After every daily check-in saves, the app evaluates silently:
1. Is today a scheduled weekly pulse day?
2. Was yesterday a missed day?
3. Are the last two days both partial completions?

If any check is true AND `last_pulse_check_at` was more than 48 hours ago → queue a pulse check. Queue appears at the top of the next app open (or immediately after check-in if in-app). Response is recorded → `notification_tier` updated → adaptive video queued.

### Jamming Challenge Map and Milestones

Named milestones (21-day version; 14-day version ends at Day 14)

| Day | Name | Notes |
|-----|------|-------|
| 1 | Reentry | Welcome back. Two pillars starts now. |
| 2 | Two Pillars | The new load is real. Acknowledge it. |
| 3 | Hard Again | Same hard-day pattern as Tuning. Tone shift: "You knew this was coming." |
| 7 | Pulse Check 1 | Weekly summary + first pulse check. Support level adjusts. |
| 9 | Halfway (21-day) | "You've done this before. You know how to finish." Reference Tuning completion. |
| 14 | Done (14-day) OR Pulse Check 2 (21-day) | Completion sequence OR second weekly pulse check |
| 18 | Almost (21-day) | Final push. Three days left. |
| 21 | Done (21-day) | Full Jamming completion sequence |

Day 3 milestone message: "Hard again. You knew it was coming — and you showed up anyway. That's the difference between someone who wants to change and someone who actually does."

Day 9 milestone message (21-day): "Halfway. You finished Tuning. You know what it feels like to complete something. Use that."

### Video Coaching Library — Jamming Additions

**Tone shift from Tuning to Jamming**
- Tuning: teaching mode, hand-holding, anticipatory, foundational
- Jamming: coaching mode, alongside, responsive to current state, experiential (references what they've already done)

**J Series — Core Jamming Videos**

| ID | Title | Trigger |
|----|-------|---------|
| J1 | "Welcome to Jamming. Here's what's different." | Jamming onboarding |
| J2 | "Why adding a second pillar feels like starting over (and why it's not)" | Day 1–2 of Jamming |
| J3 | "The weekly check-in: why reviewing matters more than tracking" | Day 6 (before first pulse check) |
| J7 | "Jamming complete. You've built something real." | Jamming completion |

**Pulse Response Videos**

| ID | Title | Trigger |
|----|-------|---------|
| J4 | "What's forming in you right now" | Pulse = Smooth Sailing |
| J5 | "Still in it means you're winning" | Pulse = Rough Waters |
| J6 | "Let's make this survivable" | Pulse = Taking On Water |

Video J1 notes: Acknowledges what they proved in Tuning. Sets honest expectations. "Two pillars is not twice as hard — it's four times as hard at first. That's not a warning. That's a promise that it gets better."

Video J4 notes: Reflective, not instructional. Invites them to notice early signs of identity shift — not just habit completion. "You're not just completing a checklist. Something is changing in you."

Video J5 notes: Validates the struggle without dramatizing it. "The person who keeps showing up in rough waters becomes the person who knows how to navigate them. That person is you."

Video J6 notes: Pastoral, direct, no shame. Presents goal revision and pillar reduction as wisdom, not retreat. "A good sailor doesn't drown trying to prove a point. They adjust the sails."

### Notification System — Jamming (Adaptive by Pulse State)

| Notification | Time | Trigger condition |
|-------------|------|------------------|
| Morning anchor | 7:00 AM | All users, daily — references day number and both pillar names |
| Evening check-in | 8:00 PM | Rough Waters + Taking On Water users only |
| Mid-week encouragement | Wednesday | Rough Waters + Taking On Water users only |
| Late rescue | 9:45 PM | Rough Waters + Taking On Water, if not checked in |
| Weekly check-in prompt | Day 7 / Day 14 | All users — "2 minutes. See your week and tell us how you're feeling." |
| Accountability partner update | Weekly | If partner set — factual, celebratory summary of the week |
| Miss-day recovery | Morning after missed day | Grace tone always. "Yesterday slipped — it happens. What matters is today." |
| Jamming completion | Immediate | Full sequence: video + Jamming badge + share card + Grooving invitation |

**`notification_tier` values and what triggers them**
- `minimal` — Smooth Sailing: morning anchor only
- `standard` — Rough Waters: morning + evening + mid-week
- `full` — Taking On Water: full Tuning-level cadence + personal message

### Jamming Completion Sequence

1. Jamming badge awarded ("You've been Jamming")
2. Completion stats: days completed, pillars, consistency percentage, pulse check history
3. Shareable card: "I just finished my Jamming challenge — [days] days, [pillars], [app name]"
4. Grooving invitation: "You've proven consistency across two pillars. Grooving is for people ready to lock this in for good. Are you ready?"

---

## Grooving Level — Full Feature Specification

### The Identity of This Level

Grooving is the first level where survival is no longer the question. The person has proven across two levels that they can show up. The coaching register shifts entirely — from motivational to contemplative. The app is no longer saying "keep going, you can do this." It is saying "look at what is forming in you."

The two primary retention risks at this level are isolation (the bigger of the two) and life interruption. The design must address both directly: isolation through community witness features, life interruption through a robust recovery and pause system that does not shame a person for a season of life.

**The Core Coaching Message for Grooving**

"You are no longer building a habit. You are becoming a person who has these habits. That is a different thing entirely."

---

### Jamming → Grooving Transition Experience

Trigger: Fires when a Jamming challenge is marked complete AND the user has completed two Jamming challenges totaling 21+ days.

1. **Full Jamming completion celebration screen**
   - Jamming badge displayed with Tuning badge alongside — the collection grows
   - Stats: days completed, pillars, consistency percentage, pulse check history across the challenge
   - Tone: "You didn't just finish — you built something across two pillars over [X] days. That is real."

2. **The "What changed?" reflection prompt**
   - Single open-ended question before the Grooving invitation appears
   - "In one sentence — what is different about you since you started Tuning?"
   - Their answer is saved and shown back at key moments during Grooving
   - This is the first time the app asks a backward-looking identity question, not just a forward-looking goal question

3. **Grooving invitation card**
   - "You've found the rhythm. Now it's time to lock it in."
   - Brief honest description: longer challenge, more pillars, a new kind of question the app will ask
   - Challenge length choice: 30 days, 50 days, or 66 days
   - "30 days if you want a strong win. 50 days to go deeper. 66 days if you're ready to make this permanent."

4. **Carry-forward of Jamming goals**
   - All proven Jamming goals pre-populated as Grooving starting goals
   - User reviews and confirms — can adjust any goal or add new ones
   - Tone: "These are yours. You earned them. Adjust anything that needs to change."

---

### Grooving Onboarding Flow (3 screens — lightest onboarding yet)

**Screen 1 — Challenge length and pillar selection**
- Present 30, 50, and 66-day options with the honest framing above
- Introduce full four-pillar access for the first time
- If user is not yet tracking all four pillars, the fourth pillar is presented as a new invitation — not a requirement
- ACT check for any new goals: one question only, same as Jamming

**Screen 2 — The 25/5 Focus Exercise**
- Introduced here for the first time as a standalone feature
- Framing: "Before you set your direction, you need to know what actually matters."
- Full exercise presented on screen:
  1. "Write down 25 things you want to accomplish in the next 2–5 years."
  2. "Circle the five most important and number them 1–5."
  3. "Your top five are your focus. The other 20 will keep you from your top five if you let them."
- The user's top 5 are saved to their profile
- This list becomes the reference point for destination goal introduction later in the challenge
- The 25/5 exercise is not required to proceed — but strongly encouraged with a brief explanation of why it matters at this stage

**Screen 3 — Introducing the Grooving Circle**
- "Consistency over 30–66 days is hard to sustain alone. The people who finish are usually the people who feel witnessed."
- Introduce the Grooving Circle: a small, private group of up to 5 people who receive a weekly summary of the user's consistency
- Distinct from the Jamming accountability partner (one person, weekly summary only)
- Grooving Circle members see: days completed per pillar, current streak, one optional reflection sentence
- Members do NOT see: individual goals, pulse state, personal notes
- Setting up the Circle is optional but presented as the strongest predictor of Grooving completion

---

### The Habit Calendar

The habit calendar is the signature visual feature of Grooving — the first time the user can see their consistency as a pattern across weeks rather than a streak count.

**What it shows**
- A grid view of every day in the challenge
- Each day color-coded by completion state: full completion, partial completion, missed, future
- Each pillar has its own color lane within the day cell (Spiritual: purple, Physical: emerald, Nutritional: amber, Personal: blue)
- Streaks visible as unbroken color runs
- Patterns visible across weeks — the person can see with their own eyes that Thursdays are hard, or that Week 3 always dips

**What it does**
- Clicking any completed day shows that day's goals and reflection (if entered)
- Weekly summary view accessible from the calendar
- "Your strongest pillar" and "your most consistent day of the week" calculated and displayed
- Pattern insight appears at Week 4: "You've missed [day of week] three weeks in a row. Want to adjust your goal for that day?"

**Where it lives**
- Accessible from the Grooving dashboard as a primary navigation item — not buried
- Weekly summary view links to the calendar with the relevant week highlighted

---

### The "Habit Taken Root" Milestone — Day 40–50

This is the most important milestone in the entire app — the moment research identifies as genuine habit formation. The app must name it explicitly and celebrate it as the threshold it actually is.

**Detection logic**
- Runs silently after every check-in between Days 40 and 50
- Triggers when: user has completed their primary goal (carried from Tuning) for 40+ consecutive or near-consecutive days (allowing for up to 3 missed days in the window)
- Only fires once per challenge — the first qualifying goal to hit the threshold

**The celebration sequence**
1. Full-screen milestone moment — distinct from any other celebration in the app
2. Message: "Something just happened. [Goal name] is no longer something you're trying to do. It's something you do. Research calls this habit formation. You just crossed the line."
3. The specific goal is named and highlighted — this is personal, not generic
4. A "Rooted" badge awarded — visually distinct from level completion badges
5. Their original "Why this matters to me" statement shown back to them
6. The "What changed?" reflection from the Jamming→Grooving transition shown back to them
7. Optional: one-sentence reflection prompt — "Now that this is part of who you are — what's next?"

**The transition into destination goals**
- The "what's next?" question is the natural bridge
- Immediately after the Rooted milestone celebration, the app introduces destination goals for the first time
- Framing: "You've built the how. Duration goals got you here. Now let's talk about where here can take you."
- The user's 25/5 top five list (if completed) is shown alongside this introduction
- Destination goal setup is optional — they can decline and continue the challenge without one
- If they set one, it lives as a separate layer above their duration goals — it does not replace them

---

### Destination Goal Introduction

Timing: Offered after the Rooted milestone fires (Day 40–50). If the Rooted milestone has not fired by Day 50, offered at the weekly check-in on Day 50 regardless.

**Framing on screen**

"A duration goal asks: what can I do every day? A destination goal asks: where is every day taking me? You've answered the first question. Here's the second."

**How it works in the app**
- One destination goal per pillar maximum at Grooving level
- Destination goals are displayed above duration goals on the dashboard — the direction above the daily practice
- A destination goal has: a name, a target date, and a connection to one of their 25/5 top five items (optional link)
- Progress toward a destination goal is NOT tracked by the app — that is intentional
- The app only asks at each weekly check-in: "Are you still moving toward [destination goal]? Yes / Slowly / No"
- This keeps destination goals directional rather than performative — the duration habits are still doing the actual work

**What the app does NOT do**
- Does not turn destination goals into another checklist
- Does not create streaks or completion tracking for destination goals
- Does not penalize or flag if a destination goal is not reached — it is a compass, not a finish line

---

### Deeper Weekly Reflection — Grooving Format

At Grooving, the weekly check-in expands beyond the pulse check. The pulse check remains (same three states, same hybrid cadence) but is preceded by a brief reflection layer.

**Weekly reflection structure (appears every 7 days)**
1. Habit calendar summary — visual week review, one tap to see the full calendar
2. Pillar performance — days completed per pillar this week, comparison to previous week
3. One reflection question — rotates weekly from a curated set (see below)
4. Pulse check — same three-state question as Jamming, same adaptive response logic
5. Destination goal check-in (if set) — "Are you still moving toward [goal]? Yes / Slowly / No"

**Rotating weekly reflection questions (sample set — build full library of 10)**
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

---

### The Grooving Circle — Community Witness Feature

**What it is**

A small, private group of up to 5 people who receive a weekly digest of the user's consistency. Not a social feed. Not public. A witnessed practice.

**What Circle members receive (weekly, automated)**
- "[Name] completed [X] of [Y] days this week across [pillar count] pillars"
- Current streak length
- One sentence from the user's weekly reflection (optional — user chooses to share or not each week)
- No goals, no pulse state, no personal notes

**What Circle members can do**
- Reply with a brief encouragement (text notification to the user only — not a feed)
- Nothing else — no likes, no comments visible to others, no performance metrics

**Why this design**

The 30–50 demographic does not want a social feed around their personal growth. They want to feel that a few trusted people know what they're doing and are quietly cheering. The Circle creates witness without performance pressure.

**Circle management**
- User adds members by name and contact (email or phone) — same mechanism as accountability partner
- Members do not need an app account — they receive a simple weekly email or text
- User can remove members at any time with no notification to the removed member

---

### Life Interruption Recovery System

For a 30–66 day challenge, a significant life interruption — illness, travel, family crisis, work emergency — is statistically likely. The app must handle this gracefully or lose the person permanently.

**Challenge pause feature (new at Grooving level)**
- User can pause their challenge for up to 14 days
- Pause extends the challenge end date by the number of paused days
- Streak is preserved during a pause — it does not count as missed days
- Pause requires a brief reason selection: Travel, Illness, Family, Work, Other
- Grooving Circle members receive a single notification: "[Name] has paused their challenge. They'll be back soon."
- Pause can only be used once per challenge — prevents it from becoming an avoidance mechanism

**Return from pause**
- On return, the app surfaces a brief re-entry moment: "Welcome back. [X] days paused. Your challenge continues where you left off."
- Day 1 back is treated as a milestone — same energy as the original Day 1
- Video G-series has a specific return video (G-Return) for this moment

---

### Video Coaching Library — Grooving Additions

**Tone shift from Jamming to Grooving**
- Jamming: coaching mode, responsive, experiential, "I see what you're going through"
- Grooving: contemplative, identity-focused, "I see who you are becoming"
- Videos are fewer but deeper — less daily hand-holding, more meaningful milestone moments

**G Series — Core Grooving Videos**

| ID | Title | Trigger |
|----|-------|---------|
| G1 | "Welcome to Grooving. The question changes here." | Grooving onboarding |
| G2 | "Why the 25/5 exercise will change how you see your time" | 25/5 screen in onboarding |
| G3 | "What the habit calendar is really showing you" | First time habit calendar is opened |
| G4 | "The people who finish are the people who feel witnessed" | Grooving Circle setup screen |
| G5 | "Something just happened — your habit has taken root" | Rooted milestone (Day 40–50) |
| G6 | "From how to where — introducing destination goals" | Post-Rooted milestone, destination goal introduction |
| G7 | "What to do when life interrupts your challenge" | Challenge pause feature activation |
| G-Return | "Welcome back. You didn't quit — you paused." | Return from pause |
| G8 | "Grooving complete. Look at what you've built." | Grooving completion |

**Pulse response videos**

| ID | Title | Trigger |
|----|-------|---------|
| G-Smooth | "You're in the groove. Notice what that feels like." | Pulse = Smooth Sailing |
| G-Rough | "Long challenges have hard weeks. This is one of them." | Pulse = Rough Waters |
| G-Water | "Let's figure out what this challenge needs to look like for you to finish it." | Pulse = Taking On Water |

**Video G5 notes — the most important video in the Grooving library**

This is the Rooted milestone video. It should feel like the person is being told something true about themselves that they may not have fully seen yet. Not a congratulations — a revelation. "You crossed a line this week that most people never cross. What you've been doing is no longer an effort. It's an expression of who you are."

**Video G6 notes — destination goal introduction**

The bridge from duration to destination. Tone is expansive, not prescriptive. "Your habits have been building a foundation. Now let's talk about what you want to build on it." Reference their 25/5 top five if completed. Do not pressure — invite.

---

### Notification System — Grooving

Grooving reduces overall notification frequency. The person has earned a lighter touch. Pulse-adaptive logic from Jamming carries forward with the same three tiers.

| Notification | Time | Trigger condition |
|-------------|------|-------------------|
| Morning anchor | 7:00 AM | All users, daily — tone shifts to reflective ("What will today build toward?") |
| Evening check-in | 8:00 PM | Rough Waters + Taking On Water only |
| Weekly reflection prompt | Day 7, 14, 21... | All users — "Your weekly reflection is ready." |
| Habit calendar insight | When pattern detected | "You've missed [day] three weeks running. Want to look at that?" |
| Rooted milestone alert | Day 40–50 trigger | "[Goal] has taken root. Open the app — something worth seeing." |
| Destination goal check-in | Weekly, if set | Included in weekly reflection flow |
| Grooving Circle digest send | Weekly | Automated to Circle members — not a user notification |
| Life interruption pause confirmation | On pause activation | "Challenge paused. [End date] extended to [new date]. Your streak is safe." |
| Return from pause | On return | "Welcome back. Day [X] of [total] continues now." |
| Grooving completion | Immediate | Full completion sequence |

---

### Grooving Completion Sequence

1. Grooving badge awarded — visually the most substantial badge yet
2. Full stats display
   - Total days, pillars, consistency percentage
   - Rooted milestone date and which goal crossed the line
   - Habit calendar summary — the whole challenge in one view
   - 25/5 top five shown: "These are still your five. Are they still right?"
   - "What changed?" reflection from the beginning of Grooving, shown back
3. Destination goal status (if set): "You set out to move toward [goal]. Are you closer? Yes / Somewhat / Not yet" — no judgment, just honest inventory
4. Shareable card: "I just finished a [30/50/66]-day Grooving challenge across [X] pillars."
5. Soloing invitation: "You've built habits. You've found your rhythm. Soloing is for people ready to sharpen what they've built — and start leading others through it. Are you ready?"

**Unlock Criteria for Soloing**

Complete one Grooving challenge of 60+ days with 80%+ consistency across all tracked pillars.

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
| reward_type | text — 'tuning_badge', 'day3_survival', 'halfway', 'day7_complete', etc. |
| challenge_id | uuid, FK to challenges, nullable |
| earned_at | timestamptz |

### Additional Tables for Jamming Level

**pulse_checks**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| challenge_id | uuid, FK to challenges |
| week_number | integer |
| pulse_state | text — 'smooth_sailing' \| 'rough_waters' \| 'taking_on_water' |
| trigger_type | text — 'scheduled_weekly' \| 'missed_day' \| 'partial_completion' |
| recorded_at | timestamptz |

### Additional Fields for Jamming Level

Add to **user_profile** table:

| Column | Type |
|--------|------|
| notification_tier | text, default 'standard' — 'minimal' \| 'standard' \| 'full' |
| last_pulse_check_at | timestamptz, nullable — enforces 48-hour cooldown between pulse checks |
| accountability_partner_name | text, nullable |
| accountability_partner_contact | text, nullable — email or phone |

---

### Additional Tables for Grooving Level

**grooving_circle_members**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| member_name | text |
| member_contact | text — email or phone |
| added_at | timestamptz |
| active | boolean, default true |

**destination_goals**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| challenge_id | uuid, FK to challenges |
| pillar | text — 'spiritual' \| 'physical' \| 'nutritional' \| 'personal' |
| goal_name | text |
| target_date | date, nullable |
| focus_item_rank | integer, nullable — links to which of the 25/5 top five this connects to (1–5) |
| status | text, default 'active' — 'active' \| 'reached' \| 'released' |
| created_at, updated_at | timestamptz |

**weekly_reflections**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| challenge_id | uuid, FK to challenges |
| week_number | integer |
| reflection_question | text — the question that was asked |
| reflection_answer | text, nullable |
| destination_goal_status | text, nullable — 'yes' \| 'slowly' \| 'no' |
| share_with_circle | boolean, default false |
| created_at | timestamptz |

**challenge_pauses**

| Column | Type |
|--------|------|
| id | uuid, PK |
| user_id | text |
| challenge_id | uuid, FK to challenges |
| pause_reason | text — 'travel' \| 'illness' \| 'family' \| 'work' \| 'other' |
| paused_at | timestamptz |
| resumed_at | timestamptz, nullable |
| days_paused | integer, nullable — calculated on resume |

### Additional Fields for Grooving Level

Add to **user_profile** table:

| Column | Type |
|--------|------|
| focus_list_25 | jsonb, nullable — stores the full 25-item list from the 25/5 exercise |
| focus_top_5 | jsonb, nullable — stores the ranked top 5 items |
| what_changed_reflection | text, nullable — the Jamming→Grooving transition reflection answer |
| rooted_milestone_fired | boolean, default false — prevents the milestone from firing twice |
| rooted_milestone_date | date, nullable |
| rooted_goal_id | text, nullable — which goal crossed the habit formation threshold |

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
