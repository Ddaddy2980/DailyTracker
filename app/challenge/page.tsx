import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import {
  getUserProfile, getActiveChallenge, getChallengeEntries,
} from '@/app/actions'
import { todayStr } from '@/lib/constants'
import type { ChallengeEntry, DayStatus } from '@/lib/types'
import ChallengeDash from './ChallengeDash'

// ── Helpers ────────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

type JsonbCol = 'spiritual' | 'physical_goals' | 'nutritional' | 'personal'

const PILLAR_COL: Record<string, JsonbCol> = {
  spiritual:   'spiritual',
  physical:    'physical_goals',
  nutritional: 'nutritional',
  personal:    'personal',
}

function isPillarComplete(entry: ChallengeEntry, pillar: string): boolean {
  const col = PILLAR_COL[pillar]
  if (!col) return false
  return entry[col].challenge_complete === true
}

function calcDayStatuses(
  startDate: string,
  entries:   ChallengeEntry[],
  pillars:   string[],
  today:     string,
): Record<string, DayStatus> {
  const entryMap = new Map(entries.map(e => [e.entry_date, e]))
  const result: Record<string, DayStatus> = {}

  for (let i = 0; i < 7; i++) {
    const date = addDays(startDate, i)
    if (date > today) {
      result[date] = 'future'
    } else if (date === today) {
      result[date] = 'today'
    } else {
      const entry = entryMap.get(date)
      result[date] = entry && pillars.every(p => isPillarComplete(entry, p))
        ? 'complete'
        : 'missed'
    }
  }
  return result
}

function calcStreak(statuses: Record<string, DayStatus>, startDate: string, today: string): number {
  let streak = 0
  for (let i = 0; i < 7; i++) {
    const date = addDays(startDate, i)
    if (date > today) break
    if (statuses[date] === 'complete') streak++
    else if (statuses[date] === 'missed') streak = 0
  }
  return streak
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ChallengePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [profile, challenge] = await Promise.all([
    getUserProfile(),
    getActiveChallenge(),
  ])

  if (!profile) redirect('/sign-in')
  if (!challenge) redirect('/dashboard')   // no active challenge — fall back to v1

  const today   = todayStr()
  const entries = await getChallengeEntries(challenge.start_date, challenge.end_date)
  const pillars = profile.selected_pillars

  const dayStatuses    = calcDayStatuses(challenge.start_date, entries, pillars, today)
  const streak         = calcStreak(dayStatuses, challenge.start_date, today)
  const entryMap       = new Map(entries.map(e => [e.entry_date, e]))
  const todayEntry     = entryMap.get(today)
  const todayCompletions = Object.fromEntries(
    pillars.map(p => [
      p,
      todayEntry ? isPillarComplete(todayEntry, p) : false,
    ])
  )

  // Current day number (1-indexed, capped at 7)
  const startMs  = new Date(challenge.start_date + 'T00:00:00').getTime()
  const todayMs  = new Date(today + 'T00:00:00').getTime()
  const dayNumber = Math.min(Math.max(Math.floor((todayMs - startMs) / 86400000) + 1, 1), 7)

  return (
    <ChallengeDash
      challenge={challenge}
      profile={profile}
      dayStatuses={dayStatuses}
      todayCompletions={todayCompletions}
      streak={streak}
      dayNumber={dayNumber}
      today={today}
    />
  )
}
