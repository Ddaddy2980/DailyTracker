import type { VideoEntry, PulseState, ChallengePause } from '@/lib/types'

// ─── Pillar definitions ──────────────────────────────────────────────────────

export const SPIRIT_DEFS = [
  { id: 'bible',       defaultName: 'Bible Reading',  hint: 'e.g. "The OneYear Bible"' },
  { id: 'podcasts',    defaultName: 'Podcasts',        hint: 'e.g. "Daily Faith Podcast"' },
  { id: 'devotionals', defaultName: 'Devotionals',     hint: 'e.g. "Morning Devotional"' },
  { id: 'journaling',  defaultName: 'Journaling',      hint: 'e.g. "Gratitude Journal"' },
] as const

export const PHYSICAL_DEFS = [
  { id: 'steps',             defaultName: 'Step Goal',             hint: 'e.g. "Walk at least 7,000 steps daily"' },
  { id: 'exercise_training', defaultName: 'Exercise Training',     hint: 'e.g. "Complete my planned workouts every day"' },
  { id: 'stretching',        defaultName: 'Stretching / Mobility', hint: 'e.g. "Stretch for at least 10 min every day"' },
  { id: 'sleep_goal',        defaultName: 'Sleep Goal',            hint: 'e.g. "Sleep at least 7 hours per night"' },
  { id: 'weight_goal',       defaultName: 'Weight Goal',           hint: 'e.g. "Track weight daily"' },
  { id: 'blood_pressure',    defaultName: 'Blood Pressure',        hint: 'e.g. "Track blood pressure daily"' },
  { id: 'other',             defaultName: 'Other',                 hint: 'e.g. "Additional physical goal"' },
] as const

// Goals that group activities by sub-type rather than using a binary physical_goals checkbox
export const CATEGORIZED_PHYSICAL_IDS = ['exercise_training', 'stretching'] as const

export const PERSONAL_DEFS = [
  { id: 'mental',    defaultName: 'Mental Sharpening', hint: 'reading, writing, learning, etc.' },
  { id: 'emotional', defaultName: 'Emotional Health',  hint: 'therapy, meditation, reflection, etc.' },
  { id: 'hobby',     defaultName: 'Hobby',             hint: 'art, music, gardening, etc.' },
] as const

export const NUTRI_OPTIONS = [
  { id: 'track_calories', label: 'Track Calories' },
  { id: 'fasting_window', label: 'Fasting Window' },
  { id: 'water',          label: 'Water'           },
  { id: 'other',          label: 'Other'           },
] as const

// ─── Types ────────────────────────────────────────────────────────────────────

export type PillarGoal = {
  id: string
  defaultName: string
  hint: string
  included: boolean
  customName: string
  subTypes?: string[]                // exercise_training and stretching use this for categories
  goalType?: 'standard' | 'tiered'  // tiered = complete when ANY one option is selected
  tiers?: string[]                   // 2–4 labelled options for tiered goals
}

export type UserConfig = {
  name: string
  start_date: string   // ISO date string YYYY-MM-DD
  duration: number
}

export type UserGoals = {
  spiritual:      PillarGoal[]
  physical:       PillarGoal[]   // user-defined physical duration goals
  exerciseTypes:  string[]       // exercise name pool used in logging dropdowns
  stretchingTypes: string[]      // stretching/mobility name pool used in logging dropdowns
  nutritional:    string[]       // array of NUTRI_OPTIONS ids
  personal:       PillarGoal[]
}

export type PhysicalActivity = {
  category: string   // sub-type name, e.g. "Strength Training", "Cardio", "Yoga"
  type:     string   // specific exercise name, e.g. "Bench Press", "Running"
  duration: number   // minutes
}

export type NutritionalLog = {
  calories?: number
  carbs?:    number
  fiber?:    number
  protein?:  number
  fat?:      number
}

export type DailyEntry = {
  entry_date:        string
  spiritual:         Record<string, boolean>
  physical_goals:    Record<string, boolean>   // binary goals: steps, sleep_goal
  activities:        PhysicalActivity[]
  sleep:             number | null
  weight:            number | null
  blood_pressure:    string | null
  nutritional:       Record<string, boolean>   // checkbox goals (fasting_window, water, other, track_calories)
  nutritional_log:   NutritionalLog            // macro amounts when track_calories is selected
  personal:          Record<string, boolean>
  tiered_selections: Record<string, string>    // goalId → selected tier label ('' if none)
  updated_at?:       string                    // ISO timestamp; present on history items, never sent on save
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function displayName(goal: PillarGoal): string {
  return goal.customName?.trim() || goal.defaultName
}

export function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

export function getDayNumber(startDate: string, targetDate?: string): number {
  const s = new Date(startDate + 'T00:00:00')
  const t = new Date((targetDate ?? todayStr()) + 'T00:00:00')
  return Math.max(1, Math.floor((t.getTime() - s.getTime()) / 86400000) + 1)
}

export function fmtDate(dateKey: string): string {
  return new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Activity helpers ──────────────────────────────────────────────────────────

export function activitiesForCategory(activities: PhysicalActivity[], cat: string): PhysicalActivity[] {
  return activities.filter(a => (a.category ?? '') === cat)
}

export function totalMinutes(activities: PhysicalActivity[], cat?: string): number {
  const list = cat ? activitiesForCategory(activities, cat) : activities
  return list.reduce((s, a) => s + (Number(a.duration) || 0), 0)
}

// ── Completion ────────────────────────────────────────────────────────────────

export function calcCompletion(entry: Partial<DailyEntry> | null, goals: UserGoals): number {
  if (!entry) return 0
  let s = 0, total = 0

  // Spiritual
  goals.spiritual.filter(g => g.included).forEach(g => {
    total++
    if (g.goalType === 'tiered') {
      if ((entry as DailyEntry).tiered_selections?.[g.id]) s++
    } else {
      if (entry.spiritual?.[g.id]) s++
    }
  })

  // Physical — user goals
  const acts = entry.activities ?? []
  goals.physical.filter(g => g.included).forEach(g => {
    total++
    if (g.id === 'exercise_training') {
      // Done if any activity belongs to one of the configured sub-types
      const subs = g.subTypes ?? []
      if (subs.length > 0) {
        if (acts.some(a => subs.includes(a.category ?? '') && (a.duration || 0) > 0)) s++
      } else {
        if (totalMinutes(acts) > 0) s++
      }
    } else if (g.id === 'stretching') {
      // Always check for the fixed 'Stretching' category — ignore any stale subTypes in DB
      if (acts.some(a => a.category === 'Stretching' && (a.duration || 0) > 0)) s++
    } else if (g.id === 'weight_goal') {
      if (entry.weight) s++
    } else if (g.id === 'blood_pressure') {
      if (entry.blood_pressure) s++
    } else {
      // Binary or tiered goal (steps, sleep_goal)
      if (g.goalType === 'tiered') {
        if ((entry as DailyEntry).tiered_selections?.[g.id]) s++
      } else {
        if (entry.physical_goals?.[g.id]) s++
      }
    }
  })

  // If exercise_training goal is NOT set up, still credit general exercise
  if (!goals.physical.find(g => g.id === 'exercise_training' && g.included)) {
    total++
    if (totalMinutes(acts) > 0) s++
  }

  // Nutritional
  goals.nutritional.forEach(id => {
    total++
    if (id === 'track_calories') {
      const log = (entry as DailyEntry).nutritional_log ?? {}
      if (Object.values(log).some(v => v != null && Number(v) > 0)) s++
    } else {
      if (entry.nutritional?.[id]) s++
    }
  })

  // Personal
  goals.personal.filter(g => g.included).forEach(g => {
    total++
    if (g.goalType === 'tiered') {
      if ((entry as DailyEntry).tiered_selections?.[g.id]) s++
    } else {
      if (entry.personal?.[g.id]) s++
    }
  })

  return total ? Math.round((s / total) * 100) : 0
}

export function defaultGoals(): UserGoals {
  return {
    spiritual:       SPIRIT_DEFS.map(d => ({ ...d, included: false, customName: '' })),
    physical:        PHYSICAL_DEFS.map(d => ({ ...d, included: false, customName: '' })),
    exerciseTypes:   [],
    stretchingTypes: [],
    nutritional:     [],
    personal:        PERSONAL_DEFS.map(d => ({ ...d, included: false, customName: '' })),
  }
}

// ── Per-pillar streak calculation ─────────────────────────────────────────────

export type PillarStreaks = {
  spiritual:   number
  physical:    number
  nutritional: number
  personal:    number
}

export function calcPillarStreaks(
  history: DailyEntry[],
  goals:   UserGoals,
  today:   string = todayStr()
): PillarStreaks {
  const byDate = new Map(history.map(e => [e.entry_date, e]))

  function streak(checkFn: (e: DailyEntry) => boolean): number {
    let count = 0
    const d = new Date(today + 'T00:00:00')
    while (true) {
      const key   = d.toISOString().split('T')[0]
      const entry = byDate.get(key)
      if (!entry || !checkFn(entry)) break
      count++
      d.setDate(d.getDate() - 1)
    }
    return count
  }

  return {
    spiritual: streak(e =>
      goals.spiritual.filter(g => g.included).some(g => e.spiritual?.[g.id])
    ),
    physical: streak(e => {
      const acts       = e.activities ?? []
      const anyActs    = totalMinutes(acts) > 0
      const anySleep   = !!e.sleep || !!e.weight
      const anyGoal    = Object.values(e.physical_goals ?? {}).some(Boolean)
      const anyTiered  = Object.values(e.tiered_selections ?? {}).some(s => !!s)
      return anyActs || anySleep || anyGoal || anyTiered
    }),
    nutritional: streak(e =>
      goals.nutritional.some(id => {
        if (id === 'track_calories') {
          const log = e.nutritional_log ?? {}
          return Object.values(log).some(v => v != null && Number(v) > 0)
        }
        return !!e.nutritional?.[id]
      })
    ),
    personal: streak(e =>
      goals.personal.filter(g => g.included).some(g => e.personal?.[g.id])
    ),
  }
}

export function emptyEntry(date: string): DailyEntry {
  return {
    entry_date:        date,
    spiritual:         {},
    physical_goals:    {},
    activities:        [],
    sleep:             null,
    weight:            null,
    blood_pressure:    null,
    nutritional:       {},
    nutritional_log:   {},
    personal:          {},
    tiered_selections: {},
  }
}

// ─── Video library ────────────────────────────────────────────────────────────
// url: '' means the video is not yet published — renders a "Coming soon" card.
// When a video is ready, set url to the YouTube embed URL
// (e.g. 'https://www.youtube.com/embed/VIDEO_ID').

export const VIDEO_LIBRARY: VideoEntry[] = [
  // Module A — Living on Purpose
  { id: 'A1', module: 'A', title: 'Why your life feels like it\'s passing you by',                url: '' },
  { id: 'A2', module: 'A', title: 'The difference between Living for, with, and on Purpose',      url: '' },
  { id: 'A3', module: 'A', title: 'Why small habits are not small',                               url: '' },
  { id: 'A4', module: 'A', title: 'The five attacks against consistency',                          url: '' },

  // Module B — The four pillars
  { id: 'B1', module: 'B', pillar: 'spiritual',   title: 'Why your spiritual life is the foundation of everything else', url: '' },
  { id: 'B2', module: 'B', pillar: 'physical',    title: 'Your body is not separate from your purpose',                 url: '' },
  { id: 'B3', module: 'B', pillar: 'nutritional', title: 'What you eat is what you become',                             url: '' },
  { id: 'B4', module: 'B', pillar: 'personal',    title: 'You are more than your to-do list',                           url: '' },

  // Module C — Duration goals and the ACT system
  { id: 'C1', module: 'C', title: 'Why destination goals keep failing you',              url: '' },
  { id: 'C2', module: 'C', title: 'The one question that changes everything',            url: '' },
  { id: 'C3', module: 'C', title: 'How to write a goal that actually works — the ACT test', url: '' },
  { id: 'C4', module: 'C', title: 'What to do when you miss a day',                     url: '' },

  // Module D — Daily challenge coaching
  { id: 'D1', module: 'D', title: 'Day 1: Let\'s go. Here\'s what today is about.',                    url: '' },
  { id: 'D2', module: 'D', title: 'Day 2: The awkwardness is normal — here\'s why.',                   url: '' },
  { id: 'D3', module: 'D', title: 'Day 3: The hardest day. Don\'t quit on day 3.',                     url: '' },
  { id: 'D4', module: 'D', title: 'Day 4: You made it through the hard part. Halfway there.',          url: '' },
  { id: 'D5', module: 'D', title: 'Day 5: Notice anything yet? Here\'s what\'s forming.',              url: '' },
  { id: 'D6', module: 'D', title: 'Day 6: One day left. Don\'t coast across the finish line.',         url: '' },
  { id: 'D7', module: 'D', title: 'Day 7: You finished. Here\'s what that means.',                     url: '' },

  // Module J — Jamming coaching
  { id: 'J1', module: 'J', title: 'Welcome to Jamming. Here\'s what\'s different.',                                        url: '' },
  { id: 'J2', module: 'J', title: 'Why adding a second pillar feels like starting over (and why it\'s not)',                url: '' },
  { id: 'J3', module: 'J', title: 'The weekly check-in: why reviewing matters more than tracking',                          url: '' },
  { id: 'J4', module: 'J', title: 'What\'s forming in you right now',                                                      url: '' },
  { id: 'J5', module: 'J', title: 'Still in it means you\'re winning',                                                     url: '' },
  { id: 'J6', module: 'J', title: 'Let\'s make this survivable',                                                           url: '' },
  { id: 'J7', module: 'J', title: 'Jamming complete. You\'ve built something real.',                                        url: '' },

  // Module G — Grooving coaching
  { id: 'G1',       module: 'G', title: 'Welcome to Grooving. The question changes here.',                    url: '', trigger: 'grooving_onboarding' },
  { id: 'G2',       module: 'G', title: 'The 25/5 exercise: why this one changes how you see everything',     url: '', trigger: 'focus_exercise_screen' },
  { id: 'G3',       module: 'G', title: 'The habit calendar: what you\'re actually building here',            url: '', trigger: 'habit_calendar_first_open' },
  { id: 'G4',       module: 'G', title: 'Your circle: why who watches matters',                               url: '', trigger: 'grooving_circle_setup' },
  { id: 'G5',       module: 'G', title: 'Rooted. What that means.',                                           url: '', trigger: 'rooted_milestone' },
  { id: 'G6',       module: 'G', title: 'Now that you\'re rooted — here\'s how to set a direction',           url: '', trigger: 'post_rooted_destination' },
  { id: 'G7',       module: 'G', title: 'If you need to pause — here\'s what that means.',                    url: '', trigger: 'pause_activation' },
  { id: 'G_RETURN', module: 'G', title: 'Welcome back. Here\'s what picking up after a pause means.',         url: '', trigger: 'pause_return' },
  { id: 'G8',       module: 'G', title: 'You finished Grooving. This is what you\'ve built.',                 url: '', trigger: 'grooving_completion' },
  { id: 'G_SMOOTH', module: 'G', title: 'Smooth sailing. Keep the rhythm.',                                   url: '', trigger: 'pulse_smooth_sailing_grooving' },
  { id: 'G_ROUGH',  module: 'G', title: 'Rough waters. Here\'s how to navigate.',                             url: '', trigger: 'pulse_rough_waters_grooving' },
  { id: 'G_WATER',  module: 'G', title: 'Taking on water. Let\'s make this survivable.',                      url: '', trigger: 'pulse_taking_on_water_grooving' },
]

// Returns the video IDs that should be surfaced on a given challenge day.
// Day 1 also shows A3, A4, and B videos for selected pillars.
// Day 3 also shows C4 (recovery video).
// All other days: just the D video for that day.
export function getDayVideoIds(dayNumber: number, selectedPillars: string[]): string[] {
  const pillarToBVideo: Record<string, string> = {
    spiritual:   'B1',
    physical:    'B2',
    nutritional: 'B3',
    personal:    'B4',
  }

  if (dayNumber === 1) {
    const bIds = selectedPillars
      .map(p => pillarToBVideo[p])
      .filter((id): id is string => Boolean(id))
    return ['D1', 'A3', 'A4', ...bIds]
  }

  if (dayNumber === 3) return ['D3', 'C4']

  const d = `D${dayNumber}`
  return d in { D2: 1, D4: 1, D5: 1, D6: 1, D7: 1 } ? [d] : []
}

// Returns J-module video IDs to surface on a given Jamming challenge day.
// Day 1   → J1 (welcome) + J2 (second pillar framing)
// Day 2   → J2
// Day 6   → J3 (before first weekly pulse check)
// Pulse state → J4 (smooth sailing) | J5 (rough waters) | J6 + C4 (taking on water)
export function getJammingVideoIds(
  dayNumber:      number,
  lastPulseState: PulseState | null,
): string[] {
  const ids: string[] = []

  if (dayNumber === 1)            ids.push('J1', 'J2')
  else if (dayNumber === 2)       ids.push('J2')
  if (dayNumber === 6)            ids.push('J3')

  if (lastPulseState === 'smooth_sailing')  ids.push('J4')
  if (lastPulseState === 'rough_waters')    ids.push('J5')
  if (lastPulseState === 'taking_on_water') ids.push('J6', 'C4')

  return ids
}

// Returns the G-module video IDs that should be surfaced for a Grooving challenge.
// G_RETURN (return from pause) surfaces once when a pause has been resumed and disappears
// after the user marks it watched — identical pattern to J-module videos in Jamming.
export function getGroovingReturnVideoId(
  pauseRecord: ChallengePause | null,
): string[] {
  if (pauseRecord?.resumed_at) return ['G_RETURN']
  return []
}

// ─── Jamming notification copy ────────────────────────────────────────────────
// All notification message copy lives here — never hardcode in components.
// Functions receive context and return the message string.

function pillarLabel(p: string): string {
  const map: Record<string, string> = {
    spiritual: 'Spiritual', physical: 'Physical',
    nutritional: 'Nutritional', personal: 'Personal',
  }
  return map[p] ?? (p.charAt(0).toUpperCase() + p.slice(1))
}

export const JAMMING_NOTIFICATIONS = {
  morning_anchor: (ctx: { dayNumber: number; pillars: string[] }) =>
    `Day ${ctx.dayNumber}. ${ctx.pillars.map(pillarLabel).join(' + ')}. You know what to do.`,

  evening_checkin: (ctx: { pillars: string[] }) =>
    `You haven't checked in yet today. ${ctx.pillars.map(pillarLabel).join(' and ')} — still time.`,

  late_rescue: () =>
    `Last chance today. Check in before midnight.`,

  mid_week_encouragement: (ctx: { dayNumber: number }) =>
    `Midweek. Day ${ctx.dayNumber}. Still in it means you're winning.`,

  miss_day_recovery: () =>
    `Yesterday slipped. That happens to everyone. What matters is what you do today.`,

  weekly_pulse_prompt: (ctx: { weekNumber: number }) =>
    `Week ${ctx.weekNumber} — 2 minutes. See your week and tell us how you're doing.`,

  accountability_update: (ctx: { partnerName: string; daysCompleted: number; durationDays: number }) =>
    `${ctx.partnerName} — ${ctx.daysCompleted} of ${ctx.durationDays} days done this week. Still showing up.`,

  jamming_complete: () =>
    `You finished Jamming. Seriously — you built something real.`,
} as const

// Notification cadence by tier
// minimal  → morning only
// standard → morning + evening + mid-week
// full     → morning + evening + mid-week + late rescue (personal message tone)
export const NOTIFICATION_CADENCE: Record<string, string[]> = {
  minimal:  ['morning_anchor'],
  standard: ['morning_anchor', 'evening_checkin', 'mid_week_encouragement'],
  full:     ['morning_anchor', 'evening_checkin', 'mid_week_encouragement', 'late_rescue'],
}

// Group notification copy — Step 16g
// Three types, each matching a specific trigger in the group notification system.
//
//   member_joined   — in-app banner shown to the creator when a new member joins
//   evening_nudge   — cron-driven nudge when co-members have checked in but the user hasn't
//   full_group_day  — in-app banner shown to all members when everyone reaches 'full' today
// Maximum number of active group memberships per user (Step 16h)
export const MAX_GROUPS_PER_USER = 12

export const GROUP_NOTIFICATIONS = {
  member_joined: (ctx: { memberName: string; groupName: string }) =>
    `${ctx.memberName} just joined ${ctx.groupName}.`,

  evening_nudge: (ctx: { count: number; groupName: string }) =>
    `${ctx.count} ${ctx.count === 1 ? 'person' : 'people'} in ${ctx.groupName} ${ctx.count === 1 ? 'has' : 'have'} checked in today. Still time to join them.`,

  full_group_day: (ctx: { groupName: string }) =>
    `Everyone in ${ctx.groupName} showed up today. That's a full group day.`,
} as const

export const GROOVING_NOTIFICATIONS = {
  morning_anchor: (ctx: { dayNumber: number; durationDays: number }) =>
    `Day ${ctx.dayNumber} of ${ctx.durationDays}. What will today build toward?`,

  evening_checkin: () =>
    `How did your pillars go today? Still time to check in.`,

  pattern_alert: (ctx: { dayOfWeek: string }) =>
    `You have missed ${ctx.dayOfWeek} three weeks running. Want to look at your goals for that day?`,

  rooted_milestone: (ctx: { goalName: string }) =>
    `${ctx.goalName} — you have done this every day for 30 days. That is not a goal anymore. That is who you are.`,

  grooving_complete: () =>
    `40 days. You built something that will outlast the challenge.`,

  pause_daily: (ctx: { daysPaused: number }) =>
    `Day ${ctx.daysPaused} of your pause. Your habits will be here when you return.`,

  weekly_reflection_prompt: () =>
    `You have reached the end of the week. Take a moment to reflect on how your pillars went.`,
} as const

// Tailwind colour classes per pillar
export const PILLAR_COLORS = {
  s:  { border: 'border-l-spirit',  title: 'text-spirit-lt',  dot: 'bg-spirit',  tab: 'bg-spirit'  },
  p:  { border: 'border-l-physi',   title: 'text-physi-lt',   dot: 'bg-physi',   tab: 'bg-physi'   },
  n:  { border: 'border-l-nutri',   title: 'text-nutri-lt',   dot: 'bg-nutri',   tab: 'bg-nutri'   },
  pe: { border: 'border-l-perso',   title: 'text-perso-lt',   dot: 'bg-perso',   tab: 'bg-perso'   },
}
