'use client'

import { PILLAR_ORDER, calcDailyCompletionPct } from '@/lib/constants'
import type { Challenge, PillarLevel, DurationGoal, PillarDailyEntry } from '@/lib/types'
import DashboardHeader from './DashboardHeader'
import PillarCard from './PillarCard'
import DormantPillarCard from './DormantPillarCard'

interface DashboardShellProps {
  challenge: Challenge
  pillarLevels: PillarLevel[]
  durationGoals: DurationGoal[]
  todayEntries: PillarDailyEntry[]
  currentDay: number
  userId: string
}

export default function DashboardShell({
  challenge,
  pillarLevels,
  durationGoals,
  todayEntries,
  currentDay,
  userId,
}: DashboardShellProps) {
  const activePillars = pillarLevels.filter((p) => p.is_active)
  const completedCount = activePillars.filter((p) =>
    todayEntries.find((e) => e.pillar === p.pillar)?.completed === true
  ).length
  const completionPct = calcDailyCompletionPct(completedCount, activePillars.length)

  return (
    <div className="min-h-screen bg-[#EBEBEC]">
      <DashboardHeader
        currentDay={currentDay}
        durationDays={challenge.duration_days}
        completionPct={completionPct}
      />

      <div className="px-4 py-4 space-y-3">
        {PILLAR_ORDER.map((pillar) => {
          const pillarLevel = pillarLevels.find((p) => p.pillar === pillar)

          if (!pillarLevel || !pillarLevel.is_active) {
            return <DormantPillarCard key={pillar} pillar={pillar} />
          }

          const goals = durationGoals.filter((g) => g.pillar === pillar)
          const todayEntry = todayEntries.find((e) => e.pillar === pillar) ?? null

          return (
            <PillarCard
              key={pillar}
              pillarLevel={pillarLevel}
              goals={goals}
              todayEntry={todayEntry}
              challengeId={challenge.id}
              userId={userId}
            />
          )
        })}
      </div>
    </div>
  )
}
