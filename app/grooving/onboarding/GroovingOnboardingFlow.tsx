'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeGroovingOnboarding } from '@/app/actions'
import type { FocusTop5Item } from '@/lib/types'
import GroovingStep1Pillars from '@/components/grooving/onboarding/GroovingStep1Pillars'
import GroovingStep2Focus   from '@/components/grooving/onboarding/GroovingStep2Focus'
import GroovingStep3Circle  from '@/components/grooving/onboarding/GroovingStep3Circle'

interface Props {
  durationDays:    30 | 50 | 66
  existingPillars: string[]
  existingGoals:   Record<string, string>
  watchedVideoIds: string[]
}

const TOTAL_STEPS = 3

interface StepOneResult {
  durationDays: 30 | 50 | 66
  pillars:      string[]
  goals:        Record<string, string>
}

interface StepTwoResult {
  focusList25: string[]
  focusTop5:   FocusTop5Item[]
}

export default function GroovingOnboardingFlow({ durationDays, existingPillars, existingGoals, watchedVideoIds }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(1)

  const [step1, setStep1] = useState<StepOneResult>({
    durationDays,
    pillars: existingPillars,
    goals:   existingGoals,
  })
  const [step2, setStep2] = useState<StepTwoResult>({ focusList25: [], focusTop5: [] })

  function handleStep1Done(data: StepOneResult) {
    setStep1(data)
    setStep(2)
  }

  function handleStep2Done(data: StepTwoResult) {
    setStep2(data)
    setStep(3)
  }

  function handleStep2Skip() {
    setStep2({ focusList25: [], focusTop5: [] })
    setStep(3)
  }

  function handleConfirm(circleMembers: { name: string; contact: string }[]) {
    startTransition(async () => {
      // A pillar is "carried forward" if it was pre-populated from the previous
      // challenge (i.e., it appears as a key in existingGoals), regardless of
      // whether the user edited the goal text during this onboarding session.
      const carriedForwardPillars = step1.pillars.filter(p => p in existingGoals)

      await completeGroovingOnboarding({
        durationDays:          step1.durationDays,
        allPillars:            step1.pillars,
        pillarGoals:           step1.goals,
        carriedForwardPillars,
        focusList25:           step2.focusList25,
        focusTop5:             step2.focusTop5,
        circleMembers,
      })
      router.push('/grooving')
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-6 px-6">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i + 1 === step
                ? 'w-6 h-2 bg-violet-500'
                : i + 1 < step
                ? 'w-2 h-2 bg-violet-700'
                : 'w-2 h-2 bg-slate-700'
            }`}
          />
        ))}
      </div>

      <div className="max-w-lg mx-auto px-6 pb-12">
        {step === 1 && (
          <GroovingStep1Pillars
            durationDays={step1.durationDays}
            existingPillars={existingPillars}
            existingGoals={existingGoals}
            watchedVideoIds={watchedVideoIds}
            onNext={handleStep1Done}
          />
        )}
        {step === 2 && (
          <GroovingStep2Focus
            onNext={handleStep2Done}
            onBack={() => setStep(1)}
            onSkip={handleStep2Skip}
          />
        )}
        {step === 3 && (
          <GroovingStep3Circle
            isPending={isPending}
            watchedVideoIds={watchedVideoIds}
            onConfirm={handleConfirm}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  )
}
