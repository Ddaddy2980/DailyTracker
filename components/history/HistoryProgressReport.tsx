'use client'

import { todayStr, addDays } from '@/lib/constants'
import type { PillarLevel, DurationGoal, PillarDailyEntry, PillarName } from '@/lib/types'
import ProgressChart from './ProgressChart'
import PillarSummaryCard, { type PillarStats } from './PillarSummaryCard'

interface Props {
  challengeStartDate: string
  allEntries: PillarDailyEntry[]
  activeGoals: DurationGoal[]
  activePillarLevels: PillarLevel[]
}

export default function HistoryProgressReport({ challengeStartDate, allEntries, activeGoals, activePillarLevels }: Props) {
  const today = todayStr()
  const activePillars = activePillarLevels.map((p) => p.pillar)

  // Pre-index entries by "pillar|date" for O(1) lookup instead of O(n) .find() per cell
  const entryIndex = new Map<string, PillarDailyEntry>()
  for (const entry of allEntries) {
    entryIndex.set(`${entry.pillar}|${entry.entry_date}`, entry)
  }

  // Pre-index goals by pillar for O(1) lookup instead of O(n) .filter() per cell
  const goalsByPillar = new Map<PillarName, DurationGoal[]>()
  for (const goal of activeGoals) {
    const pillar = goal.pillar
    const existing = goalsByPillar.get(pillar)
    if (existing) existing.push(goal)
    else goalsByPillar.set(pillar, [goal])
  }

  function getPillarPct(pillar: PillarName, date: string): number {
    const entry = entryIndex.get(`${pillar}|${date}`)
    const pillarGoals = goalsByPillar.get(pillar) ?? []
    if (pillarGoals.length === 0 || !entry) return 0
    const completed = pillarGoals.filter((g) => entry.goal_completions?.[g.id] === true).length
    return Math.round((completed / pillarGoals.length) * 100)
  }

  // Build ordered list of all elapsed challenge days
  const days: string[] = []
  let cursor = challengeStartDate
  while (cursor <= today) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }
  const totalDays = days.length

  // Single pass: build per-pillar % arrays + stats accumulators in one O(days × pillars) loop.
  const pctsAccum = new Map<PillarName, number[]>()
  const statsAccum = new Map<PillarName, { green: number; yellow: number; red: number; totalPct: number }>()
  for (const pillar of activePillars) {
    pctsAccum.set(pillar, [])
    statsAccum.set(pillar, { green: 0, yellow: 0, red: 0, totalPct: 0 })
  }

  for (let i = 0; i < days.length; i++) {
    const date = days[i]
    for (const pillar of activePillars) {
      const pct = getPillarPct(pillar, date)
      pctsAccum.get(pillar)!.push(pct)
      const s = statsAccum.get(pillar)!
      s.totalPct += pct
      if (pct >= 80) s.green++
      else if (pct >= 40) s.yellow++
      else s.red++
    }
  }

  const pillarPcts: Record<string, number[]> = {}
  for (const pillar of activePillars) {
    pillarPcts[pillar] = pctsAccum.get(pillar)!
  }

  const stats: PillarStats[] = activePillars.map((pillar) => {
    const { green, yellow, red, totalPct } = statsAccum.get(pillar)!
    const avg = totalDays === 0 ? 0 : Math.round(totalPct / totalDays)
    return { pillar, green, yellow, red, avg, total: totalDays }
  })

  return (
    <div className="space-y-4">
      <ProgressChart activePillars={activePillars} pillarPcts={pillarPcts} />
      <PillarSummaryCard stats={stats} />
    </div>
  )
}
