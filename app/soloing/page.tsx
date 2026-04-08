import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import {
  getUserProfile,
  getActiveChallenge,
  getChallengeEntries,
  getEarnedRewards,
  getPendingPulseCheck,
  getDestinationGoals,
  getActiveDurationGoalDestinations,
  getWatchedVideoIds,
  getPillarLevels,
} from '@/app/actions'
import { getMyGroups, getGroupWithMembers } from '@/app/actions-groups'
import { todayStr } from '@/lib/constants'
import type {
  ChallengeEntry, DayStatus, RewardType, GroupWithMembers,
  PillarLevel, DurationGoalDestination,
} from '@/lib/types'

import SoloingDash from './SoloingDash'

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function calcPillarDayData(
  entries: ChallengeEntry[],
  pillars: string[],
): Record<string, Record<string, boolean>> {
  const result: Record<string, Record<string, boolean>> = {}
  for (const entry of entries) {
    result[entry.entry_date] = Object.fromEntries(
      pillars.map(p => [p, isPillarComplete(entry, p)])
    )
  }
  return result
}

function calcDayStatuses(
  startDate:    string,
  durationDays: number,
  entries:      ChallengeEntry[],
  pillars:      string[],
  today:        string,
): Record<string, DayStatus> {
  const entryMap = new Map(entries.map(e => [e.entry_date, e]))
  const result: Record<string, DayStatus> = {}
  for (let i = 0; i < durationDays; i++) {
    const date = addDays(startDate, i)
    if (date > today) {
      result[date] = 'future'
    } else if (date === today) {
      result[date] = 'today'
    } else {
      const entry = entryMap.get(date)
      result[date] = entry && pillars.every(p => isPillarComplete(entry, p)) ? 'complete' : 'missed'
    }
  }
  return result
}

function calcStreak(
  statuses:     Record<string, DayStatus>,
  startDate:    string,
  durationDays: number,
  today:        string,
): number {
  let streak = 0
  for (let i = 0; i < durationDays; i++) {
    const date = addDays(startDate, i)
    if (date > today) break
    if (statuses[date] === 'complete') streak++
    else if (statuses[date] === 'missed') streak = 0
  }
  return streak
}

const WEEKDAY_NAMES = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

// Computes the longest consecutive complete-day streak within this challenge.
// Walks dayStatuses forward from start, tracking running and maximum streak lengths.
// Stops at 'today' or 'future' (partial data) — only counts fully-resolved days.
function calcLongestStreak(
  startDate:    string,
  durationDays: number,
  dayStatuses:  Record<string, DayStatus>,
): number {
  let running = 0
  let longest = 0
  for (let i = 0; i < durationDays; i++) {
    const date   = addDays(startDate, i)
    const status = dayStatuses[date]
    if (status === 'complete') {
      running++
      if (running > longest) longest = running
    } else if (status === 'missed') {
      running = 0
    } else {
      break // 'today' or 'future' — stop
    }
  }
  return longest
}

// Detects whether any missed day followed a 21+ day streak during this challenge.
// Used to determine whether to surface S6 (streak-break grace card) inline.
// S6 fires once per challenge — the watchedVideoIds guard in SoloingVideoSection
// prevents re-surfacing after the user has watched it.
function calcStreakBrokenAfter21(
  startDate:    string,
  durationDays: number,
  dayStatuses:  Record<string, DayStatus>,
): boolean {
  let runningStreak = 0
  for (let i = 0; i < durationDays; i++) {
    const date   = addDays(startDate, i)
    const status = dayStatuses[date]
    if (status === 'complete') {
      runningStreak++
    } else if (status === 'missed') {
      if (runningStreak >= 21) return true
      runningStreak = 0
    } else {
      break // 'today' or 'future' — stop walking
    }
  }
  return false
}

function detectPatternAlertDay(
  pillarDayData: Record<string, Record<string, boolean>>,
  pillars:       string[],
  today:         string,
  dayNumber:     number,
): string | null {
  if (Math.floor((dayNumber - 1) / 7) < 3) return null
  const ref = new Date(today + 'T00:00:00')
  for (let wd = 0; wd < 7; wd++) {
    const occurrences: string[] = []
    for (let i = 1; i <= 21 && occurrences.length < 3; i++) {
      const d = new Date(ref)
      d.setDate(ref.getDate() - i)
      if (d.getDay() === wd) {
        occurrences.push(new Intl.DateTimeFormat('en-CA').format(d))
      }
    }
    if (occurrences.length === 3) {
      const allMissed = occurrences.every(date => {
        const dayEntry = pillarDayData[date]
        if (!dayEntry) return true
        return !pillars.every(p => dayEntry[p] === true)
      })
      if (allMissed) return WEEKDAY_NAMES[wd]
    }
  }
  return null
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SoloingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [profile, challenge] = await Promise.all([
    getUserProfile(),
    getActiveChallenge(),
  ])

  if (!profile || !profile.onboarding_completed) redirect('/onboarding')

  // Route non-level-4 users to their appropriate dashboard
  if (profile.current_level < 4) {
    if (profile.current_level === 3) redirect('/grooving')
    if (profile.current_level === 2) redirect('/jamming')
    redirect('/challenge')
  }

  // No active challenge — need to start one
  if (!challenge) redirect('/soloing/onboarding')

  // Active challenge is at the wrong level — route accordingly
  if (challenge.level !== 4) {
    if (challenge.level === 3) redirect('/grooving')
    if (challenge.level === 2) redirect('/jamming')
    redirect('/challenge')
  }

  const today        = todayStr()
  const durationDays = challenge.duration_days

  const [
    entries, earnedRewards, pendingPulse, destinationGoals,
    durationGoalDestinations, myGroups, watchedVideoIds, pillarLevels,
  ] = await Promise.all([
    getChallengeEntries(challenge.start_date, challenge.end_date),
    getEarnedRewards(challenge.id),
    getPendingPulseCheck({
      challengeId: challenge.id,
      startDate:   challenge.start_date,
      pillars:     profile.selected_pillars,
    }),
    getDestinationGoals(challenge.id),
    getActiveDurationGoalDestinations(challenge.id),
    getMyGroups(),
    getWatchedVideoIds(),
    getPillarLevels(),
  ])

  const groupsData = await Promise.all(myGroups.map(g => getGroupWithMembers(g.id)))
  const groups     = groupsData.filter((g): g is GroupWithMembers => g !== null)

  const pillars     = profile.selected_pillars
  const dayStatuses = calcDayStatuses(challenge.start_date, durationDays, entries, pillars, today)
  const streak      = calcStreak(dayStatuses, challenge.start_date, durationDays, today)

  const entryMap        = new Map(entries.map(e => [e.entry_date, e]))
  const todayEntry      = entryMap.get(today)
  const todayCompletions = Object.fromEntries(
    pillars.map(p => [p, todayEntry ? isPillarComplete(todayEntry, p) : false])
  )

  const startMs   = new Date(challenge.start_date + 'T00:00:00').getTime()
  const todayMs   = new Date(today + 'T00:00:00').getTime()
  const dayNumber = Math.min(
    Math.max(Math.floor((todayMs - startMs) / 86_400_000) + 1, 1),
    durationDays,
  )

  const pillarDayData = calcPillarDayData(entries, pillars)

  const earnedRewardTypes = earnedRewards.map(r => r.reward_type) as RewardType[]

  const destinationGoalsByPillar = durationGoalDestinations.reduce<Record<string, DurationGoalDestination[]>>(
    (acc, goal) => {
      if (!acc[goal.pillar]) acc[goal.pillar] = []
      acc[goal.pillar].push(goal)
      return acc
    },
    {}
  )

  const patternAlertDay     = detectPatternAlertDay(pillarDayData, pillars, today, dayNumber)
  const streakBrokenAfter21 = calcStreakBrokenAfter21(challenge.start_date, durationDays, dayStatuses)
  const longestStreak       = calcLongestStreak(challenge.start_date, durationDays, dayStatuses)

  return (
    <SoloingDash
      challenge={challenge}
      profile={profile}
      dayStatuses={dayStatuses}
      pillarDayData={pillarDayData}
      todayCompletions={todayCompletions}
      streak={streak}
      dayNumber={dayNumber}
      today={today}
      earnedRewards={earnedRewardTypes}
      pendingPulse={pendingPulse}
      destinationGoals={destinationGoals}
      destinationGoalsByPillar={destinationGoalsByPillar}
      groups={groups}
      watchedVideoIds={watchedVideoIds}
      patternAlertDay={patternAlertDay}
      pillarLevels={pillarLevels}
      lastPillarCheckAt={profile.last_pillar_check_at ?? null}
      streakBrokenAfter21={streakBrokenAfter21}
      longestStreak={longestStreak}
    />
  )
}
