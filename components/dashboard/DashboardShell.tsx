'use client'

import { PILLAR_ORDER, calcDailyCompletionPct, todayStr } from '@/lib/constants'
import type { Challenge, PillarLevel, DurationGoal, DestinationGoal, PillarDailyEntry, PulseState } from '@/lib/types'
import DashboardHeader from './DashboardHeader'
import PillarCard from './PillarCard'
import TuningPillarCard from './TuningPillarCard'
import JammingPillarCard from './JammingPillarCard'
import GroovingPillarCard from './GroovingPillarCard'
import SoloingPillarCard from './SoloingPillarCard'
import DormantPillarCard from './DormantPillarCard'
import PausedDashboard from './PausedDashboard'
import LifePauseBanner from './LifePauseBanner'
import CompletionCountdownBanner from './CompletionCountdownBanner'

interface DashboardShellProps {
  challenge: Challenge
  pillarLevels: PillarLevel[]
  durationGoals: DurationGoal[]
  destinationGoals: DestinationGoal[]
  windowEntries: PillarDailyEntry[]
  currentDay: number
  effectiveDay: number
  daysRemaining: number
  viewingDate: string
  userId: string
  isPaused: boolean
  pulseState: PulseState
  username: string | null
}

export default function DashboardShell({
  challenge,
  pillarLevels,
  durationGoals,
  destinationGoals,
  windowEntries,
  currentDay,
  effectiveDay,
  daysRemaining,
  viewingDate,
  userId,
  isPaused,
  pulseState,
  username,
}: DashboardShellProps) {
  const activePillars = pillarLevels.filter((p) => p.is_active)
  const viewingDateEntries = windowEntries.filter((e) => e.entry_date === viewingDate)
  const isViewingToday = viewingDate === todayStr()

  const completedCount = activePillars.filter((p) =>
    viewingDateEntries.find((e) => e.pillar === p.pillar)?.completed === true
  ).length
  const completionPct = calcDailyCompletionPct(completedCount, activePillars.length)

  const headerProps = {
    username,
    viewingDate,
    challengeStartDate: challenge.start_date,
    challengeDurationDays: challenge.duration_days,
    completionPct,
    effectiveDay,
  }

  if (isPaused && challenge.paused_at) {
    return (
      <div className="min-h-screen bg-[#EBEBEC]">
        <div className="px-4 py-2 space-y-2">
          <DashboardHeader {...headerProps} isPaused={true} />
          <PausedDashboard
            pausedAt={challenge.paused_at}
            pauseReason={challenge.pause_reason}
            pauseDaysUsed={challenge.pause_days_used}
            maxPauseDays={14}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#EBEBEC]">
      <div className="px-4 py-2 space-y-2">
        <DashboardHeader {...headerProps} isPaused={false} />

        {/* Completion countdown — today view only, not paused, days 1–5 remaining */}
        {isViewingToday && !isPaused && daysRemaining >= 1 && daysRemaining <= 5 && (
          <CompletionCountdownBanner daysRemaining={daysRemaining} />
        )}

        {/* Life pause banner — today view only, not paused, taking_on_water pulse, at least day 4 */}
        {isViewingToday && !isPaused && pulseState === 'taking_on_water' && effectiveDay > 3 && (
          <LifePauseBanner />
        )}

        {PILLAR_ORDER.map((pillar) => {
          const pillarLevel = pillarLevels.find((p) => p.pillar === pillar)

          if (!pillarLevel || !pillarLevel.is_active) {
            return <DormantPillarCard key={`${pillar}-${viewingDate}`} pillar={pillar} />
          }

          const goals = durationGoals.filter((g) => g.pillar === pillar)
          const todayEntry = viewingDateEntries.find((e) => e.pillar === pillar) ?? null

          if (pillarLevel.level === 1 || pillarLevel.level === 2) {
            const pillarWindowEntries = windowEntries.filter((e) => e.pillar === pillar)
            const CardComponent = pillarLevel.level === 1 ? TuningPillarCard : JammingPillarCard
            return (
              <CardComponent
                key={`${pillar}-${viewingDate}`}
                pillarLevel={pillarLevel}
                goals={goals}
                todayEntry={todayEntry}
                windowEntries={pillarWindowEntries}
                challengeId={challenge.id}
                challengeStartDate={challenge.start_date}
                userId={userId}
                entryDate={viewingDate}
                dayNumber={effectiveDay}
                pulseState={pulseState}
              />
            )
          }

          if (pillarLevel.level === 3 || pillarLevel.level === 4) {
            const pillarDestinationGoals = destinationGoals.filter((g) => g.pillar === pillar)
            const CardComponent = pillarLevel.level === 3 ? GroovingPillarCard : SoloingPillarCard
            return (
              <CardComponent
                key={`${pillar}-${viewingDate}`}
                pillarLevel={pillarLevel}
                goals={goals}
                destinationGoals={pillarDestinationGoals}
                todayEntry={todayEntry}
                challengeId={challenge.id}
                userId={userId}
                entryDate={viewingDate}
                pulseState={pulseState}
              />
            )
          }

          return (
            <PillarCard
              key={`${pillar}-${viewingDate}`}
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
