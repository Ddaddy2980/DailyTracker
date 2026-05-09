import ActivePauseCard from './ActivePauseCard'
import ImmediatePauseCard from './ImmediatePauseCard'
import ScheduledPauseCard from './ScheduledPauseCard'

interface ChallengePauseToolsProps {
  isPaused:             boolean
  pauseDaysUsed:        number
  scheduledPauseDate:   string | null
  scheduledPauseReason: string | null
  maxPauseDays:         number
}

export default function ChallengePauseTools({
  isPaused,
  pauseDaysUsed,
  scheduledPauseDate,
  scheduledPauseReason,
  maxPauseDays,
}: ChallengePauseToolsProps) {
  const daysRemaining = Math.max(0, maxPauseDays - pauseDaysUsed)

  return (
    <section id="challenge-tools" className="mt-10 mb-6">
      <h2 className="text-base font-semibold text-slate-700 mb-1">Challenge Tools</h2>
      <p className="text-xs text-slate-400 mb-4">
        You have {daysRemaining} of {maxPauseDays} pause days remaining.
      </p>

      {isPaused ? (
        <ActivePauseCard />
      ) : (
        <div className="space-y-4">
          {daysRemaining > 0 && <ImmediatePauseCard />}
          <ScheduledPauseCard
            scheduledPauseDate={scheduledPauseDate}
            scheduledPauseReason={scheduledPauseReason}
          />
          {daysRemaining === 0 && (
            <p className="text-xs text-slate-400 text-center">
              You&apos;ve used all {maxPauseDays} pause days for this challenge.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
