// =============================================================================
// Tempo — the metronome coach's Phase-1 line library + selection logic.
//
// Phase 1 is a curated library only (no LLM). Lines are grouped by moment;
// pillar-complete lines carry the voice arc that deepens per level:
//   1 Tuning   — hype-man
//   2 Jamming  — honest workout partner
//   3 Grooving — wry contemplative
//   4 Soloing  — quiet, proud presence
//
// Rules baked in here:
//   • Session no-repeat — a line won't repeat until its pool is exhausted this
//     session (sessionStorage), then that pool refreshes.
//   • Unprompted cap — proactive pop-ups (the load greeting) are capped at 2 per
//     session. Reactions to a user action (pillar complete, day sealed) are
//     "prompted" and never capped.
//   • Morning priority — comeback > grace-covered > time-of-day greeting.
//   • Faith boundary — no Scripture in mascot lines (Scripture appears only in
//     its own reverent frame elsewhere).
//
// The 30-day cross-session no-repeat window and the Ask-Tempo sheet are Phase 4.
// =============================================================================

import type { LevelNumber } from '@/lib/types'

export const TEMPO_BUBBLE_DURATION_MS = 4200
const UNPROMPTED_CAP = 2

const USED_KEY = 'tempo:used'
const UNPROMPTED_KEY = 'tempo:unprompted'

// `{name}` expands to ", David" (comma-prefixed) or "" — lines without the token
// are unaffected, so number/name-free lines stay evergreen.
const GREETINGS_MORNING = [
  'Morning{name}. Let’s set the tempo for today. 🎵',
  'Up and at it{name}. First beat’s the hardest — let’s take it.',
  'New day, same steady rhythm{name}. I’m ready when you are.',
  'Morning{name}. The metronome’s warmed up. Your move.',
  'Rise and shine{name} — let’s keep the streak breathing.',
  'Good morning{name}. Those rings won’t fill themselves. 🎵',
]

const GREETINGS_AFTERNOON = [
  'Afternoon{name}. Still plenty of day to make it count.',
  'Midday{name}? The rings are waiting.',
  'Afternoon{name}. Let’s not let the day drift off-beat.',
  'Halfway through{name}. Let’s finish in rhythm.',
]

const GREETINGS_EVENING = [
  'Evening{name}. Let’s close the day out clean.',
  'Winding down{name}? Seal what you can before midnight.',
  'Evening{name}. A few rings left — let’s land them.',
  'The day’s almost sung{name}. Finish strong. 🎵',
]

const GRACE_MORNING = [
  'Grace covered yesterday — your streak holds. Today, let’s not need it. 🎵',
  'Yesterday slipped; grace caught it. Streak’s intact. Back on the beat.',
  'You missed a day and the streak still stands — that’s what grace is for. Let’s keep it earned.',
]

const COMEBACK_MORNING = [
  'There you are. The metronome kept your seat warm. Let’s pick the rhythm back up. 🎵',
  'Welcome back{name}. Every streak starts with one beat — let’s take it.',
  'Good to see you again{name}. No lecture. Just: ready when you are.',
  'You came back. That’s the whole game. Let’s begin. 🎵',
]

// Pillar-complete, one pool per level register.
const PILLAR_COMPLETE: Record<LevelNumber, string[]> = {
  // 1 Tuning — hype-man
  1: [
    'Tick. That’s one — and one is how every streak starts. 🎵',
    'Ring filled! Look at you go. Warming up the confetti.',
    'Boom. Pillar down. This is the good part — keep pulling.',
    'Yes! That’s the sound of momentum. Do another.',
    'One ring lit. The wall’s starting to glow. 🎵',
    'That’s a beat I can dance to. More where that came from?',
  ],
  // 2 Jamming — honest workout partner
  2: [
    'Pillar sealed. That’s the rep that counts — the one you almost skipped.',
    'Done. You’re building something real here, one honest day at a time.',
    'Nice work. Grooving’s not far off if you keep stacking these.',
    'That’s how it’s done. No shortcuts, just showing up. 🎵',
    'Locked in. This is the work nobody sees — I see it.',
  ],
  // 3 Grooving — wry contemplative
  3: [
    'Sealed. At this point the habit is doing you, not the other way around.',
    'Tick. You’ve done this so many times it barely needs me. Almost.',
    'Another one, quietly. The steady ones always win — dull, isn’t it. 🎵',
    'Done. You didn’t think about it, did you. That’s the whole point.',
    'Pillar closed. Rhythm this deep doesn’t ask for applause. Here’s some anyway.',
  ],
  // 4 Soloing — quiet, proud presence
  4: [
    'Sealed. I barely need to be here. I stay for the view. 🎵',
    'Done. This is just who you are now. Nothing to announce.',
    'Tick. Quiet, certain, yours. That’s what mastery sounds like.',
    'Complete. You’ve made this part of the furniture of your life.',
    'There it is. No fanfare needed — you outgrew that.',
  ],
}

const PERFECT_DAY = [
  'Day sealed. Every ring lit. Somewhere a metronome is dancing — it’s me. 🎵',
  'That’s the whole day, done. The wall’s fully lit. Rest easy.',
  'Perfect day. All of them, every one. 🎵',
  'Sealed and glowing. This is the day the streak will remember.',
  'All rings full. You didn’t just show up — you finished. 🎵',
  'Day complete. Tick, tick, tick — that’s the sound of a life on purpose.',
]

// -----------------------------------------------------------------------------
// Session memory (client-only; every accessor is a no-op under SSR)
// -----------------------------------------------------------------------------

function hasStorage(): boolean {
  return typeof window !== 'undefined' && !!window.sessionStorage
}

function getUsed(): Set<string> {
  if (!hasStorage()) return new Set()
  try {
    const raw = window.sessionStorage.getItem(USED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveUsed(used: Set<string>): void {
  if (!hasStorage()) return
  try {
    window.sessionStorage.setItem(USED_KEY, JSON.stringify([...used]))
  } catch {
    /* storage full / disabled — no-repeat degrades gracefully */
  }
}

function unpromptedCount(): number {
  if (!hasStorage()) return 0
  const n = Number(window.sessionStorage.getItem(UNPROMPTED_KEY))
  return Number.isFinite(n) ? n : 0
}

function bumpUnprompted(): void {
  if (!hasStorage()) return
  try {
    window.sessionStorage.setItem(UNPROMPTED_KEY, String(unpromptedCount() + 1))
  } catch {
    /* no-op */
  }
}

// Pick a line from `pool` avoiding session repeats; refresh the pool once spent.
function pick(pool: string[]): string {
  const used = getUsed()
  let candidates = pool.filter((l) => !used.has(l))
  if (candidates.length === 0) {
    // Pool exhausted this session — free just these lines and reuse.
    pool.forEach((l) => used.delete(l))
    candidates = pool
  }
  const choice = candidates[Math.floor(Math.random() * candidates.length)]
  used.add(choice)
  saveUsed(used)
  return choice
}

function interpolate(line: string, name: string | null | undefined): string {
  return line.replaceAll('{name}', name ? `, ${name}` : '')
}

function greetingPoolForHour(hour: number): string[] {
  if (hour >= 4 && hour < 12) return GREETINGS_MORNING
  if (hour >= 12 && hour < 18) return GREETINGS_AFTERNOON
  return GREETINGS_EVENING
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export interface GreetingContext {
  name?:               string | null
  hour:                number   // 0–23, client local
  comeback?:           boolean  // lapsed user returning
  graceUsedLastNight?: boolean  // grace covered a missed yesterday
}

/**
 * Dashboard-load greeting. Unprompted → subject to the per-session cap; returns
 * `null` once the cap is hit (caller shows nothing). Priority: comeback > grace
 * > time-of-day greeting.
 */
export function selectGreeting(ctx: GreetingContext): string | null {
  if (unpromptedCount() >= UNPROMPTED_CAP) return null

  let line: string
  if (ctx.comeback) line = pick(COMEBACK_MORNING)
  else if (ctx.graceUsedLastNight) line = pick(GRACE_MORNING)
  else line = pick(greetingPoolForHour(ctx.hour))

  bumpUnprompted()
  return interpolate(line, ctx.name)
}

/**
 * Reaction to completing a pillar's last goal. Prompted (never capped). Register
 * deepens with the pillar's level.
 */
export function selectPillarCompleteLine(level: LevelNumber): string {
  return pick(PILLAR_COMPLETE[level])
}

/** Reaction to sealing the whole day. Prompted (never capped). */
export function selectPerfectDayLine(): string {
  return pick(PERFECT_DAY)
}

/** Clear session memory (no-repeat set + unprompted counter). For sign-out/tests. */
export function resetTempoSession(): void {
  if (!hasStorage()) return
  try {
    window.sessionStorage.removeItem(USED_KEY)
    window.sessionStorage.removeItem(UNPROMPTED_KEY)
  } catch {
    /* no-op */
  }
}
