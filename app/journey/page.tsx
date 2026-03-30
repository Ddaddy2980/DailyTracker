import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import {
  getUserProfile,
  getActiveChallenge,
  getChallengeEntries,
  getEarnedRewards,
  getPendingPulseCheck,
  getPulseHistory,
  getDestinationGoals,
  getPauseStatus,
  getWatchedVideoIds,
} from '@/app/actions'
import { getMyGroups, getGroupWithMembers } from '@/app/actions-groups'
import { todayStr } from '@/lib/constants'
import { getJourneyStatus } from '@/lib/journeyEngine'
import type { ChallengeEntry, DayStatus, RewardType, GroupWithMembers } from '@/lib/types'
import JourneyDash from './JourneyDash'

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

// ── Pattern alert (Level 3+) ──────────────────────────────────────────────────

const WEEKDAY_NAMES = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

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

export default async function JourneyPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [profile, challenge] = await Promise.all([
    getUserProfile(),
    getActiveChallenge(),
  ])

  if (!profile || !profile.onboarding_completed) redirect('/onboarding')
  if (!challenge || !challenge.is_continuous) redirect('/dashboard')

  const journeyStatus = getJourneyStatus(challenge)
  const today         = todayStr()
  const durationDays  = challenge.duration_days

  const [
    entries, earnedRewards, pendingPulse, pulseHistory,
    destinationGoals, myGroups, pauseStatus, watchedVideoIds,
  ] = await Promise.all([
    getChallengeEntries(challenge.start_date, challenge.end_date),
    getEarnedRewards(challenge.id),
    getPendingPulseCheck({
      challengeId: challenge.id,
      startDate:   challenge.start_date,
      pillars:     profile.selected_pillars,
    }),
    getPulseHistory(challenge.id),
    getDestinationGoals(challenge.id),
    getMyGroups(),
    getPauseStatus(challenge.id),
    getWatchedVideoIds(),
  ])

  const groupsData = await Promise.all(myGroups.map(g => getGroupWithMembers(g.id)))
  const groups     = groupsData.filter((g): g is GroupWithMembers => g !== null)

  const pillars     = profile.selected_pillars
  const dayStatuses = calcDayStatuses(challenge.start_date, durationDays, entries, pillars, today)
  const streak      = calcStreak(dayStatuses, challenge.start_date, durationDays, today)

  const entryMap         = new Map(entries.map(e => [e.entry_date, e]))
  const todayEntry       = entryMap.get(today)
  const todayCompletions = Object.fromEntries(
    pillars.map(p => [p, todayEntry ? isPillarComplete(todayEntry, p) : false])
  )

  const pillarDayData        = calcPillarDayData(entries, pillars)
  const earnedRewardTypes    = earnedRewards.map(r => r.reward_type) as RewardType[]
  const patternAlertDay      = detectPatternAlertDay(pillarDayData, pillars, today, journeyStatus.currentDay)
  const rootedMilestoneToday = profile.rooted_milestone_date === today && profile.rooted_milestone_fired

  return (
    <JourneyDash
      challenge={challenge}
      profile={profile}
      journeyStatus={journeyStatus}
      entries={entries}
      dayStatuses={dayStatuses}
      pillarDayData={pillarDayData}
      todayCompletions={todayCompletions}
      streak={streak}
      today={today}
      earnedRewards={earnedRewardTypes}
      pendingPulse={pendingPulse}
      pulseHistory={pulseHistory}
      destinationGoals={destinationGoals}
      groups={groups}
      pauseStatus={pauseStatus}
      watchedVideoIds={watchedVideoIds}
      patternAlertDay={patternAlertDay}
      rootedMilestoneToday={rootedMilestoneToday}
    />
  )
}
