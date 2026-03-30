// ─── Duration coaching (Option 2) ────────────────────────────────────────────

export const DURATION_INFO: Record<string, { headline: string; detail: string }> = {
  '21': {
    headline: 'Starter Challenge',
    detail: 'Long enough to build initial awareness and feel the rhythm of daily consistency. A great first step.',
  },
  '40': {
    headline: 'Classic Reset',
    detail: 'A proven length — long enough to experience genuine, noticeable change across all four pillars.',
  },
  '60': {
    headline: 'Deep Reset',
    detail: 'Two full months of daily practice. Habits begin shifting from effortful choices to natural identity.',
  },
  '90': {
    headline: 'Identity-Level Change',
    detail: 'Research shows 66 days is the average for habit formation. 90 days ensures the new habits stick for good.',
  },
  'other': {
    headline: 'Custom Challenge',
    detail: 'Whatever you choose, commit fully before you begin. Make it long enough to feel real change.',
  },
}

// ─── ACT framework nudge (Option 1) ──────────────────────────────────────────
// From "Setting Duration Goals": every goal must be Attainable, Challenging, Trackable

export const ACT_NUDGE = 'Is this attainable on your worst day? Challenging enough to require real intention? Trackable with a clear yes/no?'

// ─── Per-goal sample duration goals (Option 5) ───────────────────────────────
// Keyed by the goal IDs in SPIRIT_DEFS and PERSONAL_DEFS

export const GOAL_SAMPLES: Record<string, string[]> = {
  // Spiritual — SPIRIT_DEFS ids
  bible:       [
    'Read 1 chapter of Scripture every day',
    'Read 3 chapters every morning',
    'Work through a 1-year Bible reading plan',
  ],
  podcasts:    [
    'Listen to 1 faith-focused podcast episode daily',
    'Listen to a sermon or teaching each morning',
    '20 min of Christian audio content per day',
  ],
  devotionals: [
    'Complete one devotional reading before bed each night',
    'Work through a daily devotional app each morning',
    'Read one devotional page with coffee each day',
  ],
  journaling:  [
    'Write 5 min of spiritual reflection every day',
    'Record one insight or answered prayer each day',
    'Write a short prayer in a journal each evening',
  ],

  // Physical — PHYSICAL_DEFS ids
  steps:      [
    'Walk at least 7,000 steps every day',
    'Hit 10,000 steps daily',
    'Take the stairs and park farther to hit my step goal',
  ],
  stretching: [
    'Stretch for at least 10 min every morning',
    'Complete a 10-min mobility routine daily',
    'Do a 5-min stretch before bed each night',
  ],
  sleep_goal: [
    'Sleep at least 7 hours per night',
    'In bed by 10pm for at least 7.5 hours of sleep',
    'Sleep 8 hours and track with my wearable',
  ],
  exercise_training: [
    'Complete my planned workouts every day',
    'Exercise at least 20 min every day — no exceptions',
    'Never have a zero — even a short session counts',
  ],

  // Personal — PERSONAL_DEFS ids
  mental:    [
    'Read at least 10 pages of a current book every day',
    'Listen to 1 educational podcast or audiobook chapter daily',
    'Spend 15 min on active skill-building (language, course, instrument)',
    'Write at least 250 words — journal, article, or reflection',
  ],
  emotional: [
    'Write one specific gratitude statement every day',
    'Spend 5 min in quiet reflection or meditation daily',
    'Have one meaningful, unhurried conversation each day',
    'Send one intentional encouragement to someone each day',
  ],
  hobby:     [
    'Spend 15 min on a creative hobby every day',
    'Practice a musical instrument for at least 10 min',
    'Work on a hands-on project for at least 20 min',
    'Spend 10 min in a hobby that has no practical output — purely for enjoyment',
  ],
}

// ─── Exercise type suggestions (Option 5 — Physical) ─────────────────────────

export const EXERCISE_SUGGESTIONS = [
  'Morning Run', 'Walking', 'Cycling', 'Swimming', 'Weight Training',
  'Pushups & Pullups', 'Yoga', 'Stretching', 'HIIT', 'Hiking',
  'Basketball', 'Pickleball', 'Jump Rope', 'Rowing', 'Elliptical',
]
