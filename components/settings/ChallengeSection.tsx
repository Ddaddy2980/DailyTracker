import ChallengeDurationEditor from '@/components/goals/ChallengeDurationEditor'

interface ChallengeSectionProps {
  currentDuration: number
  currentDay:      number
  isPaused:        boolean
}

export default function ChallengeSection({
  currentDuration,
  currentDay,
  isPaused,
}: ChallengeSectionProps) {
  return (
    <section className="bg-white rounded-2xl px-5 py-5 shadow-sm mb-4">
      <h2 className="text-base font-semibold text-slate-800 mb-1">Challenge</h2>
      <p className="text-xs text-slate-400 mb-4">
        Current challenge: {currentDuration} days · Day {currentDay}
      </p>

      {isPaused ? (
        <p className="text-sm text-slate-500 italic">
          Duration changes are unavailable while your challenge is paused.
        </p>
      ) : (
        <ChallengeDurationEditor
          currentDuration={currentDuration}
          currentDay={currentDay}
        />
      )}
    </section>
  )
}
