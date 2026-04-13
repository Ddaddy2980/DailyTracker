'use client'

import { PILLAR_ORDER, calcDailyCompletionPct } from '@/lib/constants'
import type { Challenge, PillarLevel, DurationGoal, DestinationGoal, PillarDailyEntry } from '@/lib/types'
import DashboardHeader from './DashboardHeader'
import DayNavigator from './DayNavigator'
import PillarCard from './PillarCard'
import TuningPillarCard from './TuningPillarCard'
import JammingPillarCard from './JammingPillarCard'
import GroovingPillarCard from './GroovingPillarCard'
import SoloingPillarCard from './SoloingPillarCard'
import DormantPillarCard from './DormantPillarCard'

interface DashboardShellProps {
  challenge: Challenge
  pillarLevels: PillarLevel[]
  durationGoals: DurationGoal[]
  destinationGoals: DestinationGoal[]
  windowEntries: PillarDailyEntry[]
  currentDay: number
  viewingDate: string
  userId: string
}

export default function DashboardShell({
  challenge,
  pillarLevels,
  durationGoals,
  destinationGoals,
  windowEntries,
  currentDay,
  viewingDate,
  userId,
}: DashboardShellProps) {
  const activePillars = pillarLevels.filter((p) => p.is_active)
  const viewingDateEntries = windowEntries.filter((e) => e.entry_date === viewingDate)

  const completedCount = activePillars.filter((p) =>
    viewingDateEntries.find((e) => e.pillar === p.pillar)?.completed === true
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
        <DayNavigator
          viewingDate={viewingDate}
          challengeStartDate={challenge.start_date}
          challengeDurationDays={challenge.duration_days}
        />

        {PILLAR_ORDER.map((pillar) => {
          const pillarLevel = pillarLevels.find((p) => p.pillar === pillar)

          if (!pillarLevel || !pillarLevel.is_active) {
            return <DormantPillarCard key={pillar} pillar={pillar} />
          }

          const goals = durationGoals.filter((g) => g.pillar === pillar)
          const todayEntry = viewingDateEntries.find((e) => e.pillar === pillar) ?? null

          if (pillarLevel.level === 1 || pillarLevel.level === 2) {
            const pillarWindowEntries = windowEntries.filter((e) => e.pillar === pillar)
            const CardComponent = pillarLevel.level === 1 ? TuningPillarCard : JammingPillarCard
            return (
              <CardComponent
                key={pillar}
                pillarLevel={pillarLevel}
                goals={goals}
                todayEntry={todayEntry}
                windowEntries={pillarWindowEntries}
                challengeId={challenge.id}
                challengeStartDate={challenge.start_date}
                userId={userId}
                entryDate={viewingDate}
              />
            )
          }

          if (pillarLevel.level === 3 || pillarLevel.level === 4) {
            const pillarDestinationGoals = destinationGoals.filter((g) => g.pillar === pillar)
            const CardComponent = pillarLevel.level === 3 ? GroovingPillarCard : SoloingPillarCard
            return (
              <CardComponent
                key={pillar}
                pillarLevel={pillarLevel}
                goals={goals}
                destinationGoals={pillarDestinationGoals}
                todayEntry={todayEntry}
                challengeId={challenge.id}
                userId={userId}
                entryDate={viewingDate}
              />
            )
          }

          // Safety net — should not be reached with valid level data
          return (
            <PillarCard
              key={pillar}
              pillarLevel={pillarLevel}
              goals={goals}
              todayEntry={todayEntry}
              challengeId={challenge.id}
              userId={userId}
              entryDate={viewingDate}
            />
          )
        })}
      </div>
    </div>
  )
}
