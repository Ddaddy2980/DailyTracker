'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from '@/app/actions'
import type { PillarName } from '@/lib/types'
import StepWelcome      from '@/components/onboarding/StepWelcome'
import StepPillarSelect from '@/components/onboarding/StepPillarSelect'
import StepRollercoaster from '@/components/onboarding/StepRollercoaster'
import StepGoalSetup    from '@/components/onboarding/StepGoalSetup'
import StepConfirmation from '@/components/onboarding/StepConfirmation'

interface OnboardingState {
  purposeStatement: string
  selectedPillars:  PillarName[]
  goals:            Record<string, string>
}

const TOTAL_STEPS = 5

export default function OnboardingFlow() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(1)
  const [state, setState] = useState<OnboardingState>({
    purposeStatement: '',
    selectedPillars:  [],
    goals:            {},
  })

  function next() { setStep(s => Math.min(s + 1, TOTAL_STEPS)) }
  function back() { setStep(s => Math.max(s - 1, 1)) }

  function handleWelcomeDone(purposeStatement: string) {
    setState(s => ({ ...s, purposeStatement }))
    next()
  }

  function handlePillarsDone(selectedPillars: PillarName[]) {
    setState(s => ({ ...s, selectedPillars }))
    next()
  }

  function handleGoalsDone(goals: Record<string, string>) {
    setState(s => ({ ...s, goals }))
    next()
  }

  function handleConfirm() {
    startTransition(async () => {
      await completeOnboarding({
        purposeStatement: state.purposeStatement,
        selectedPillars:  state.selectedPillars,
        goals:            state.goals,
      })
      router.push('/dashboard')
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Step progress dots */}
      <div className="flex items-center justify-center gap-2 pt-6 px-6">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i + 1 === step
                ? 'w-6 h-2 bg-purple-500'
                : i + 1 < step
                ? 'w-2 h-2 bg-purple-700'
                : 'w-2 h-2 bg-slate-700'
            }`}
          />
        ))}
      </div>

      <div className="max-w-lg mx-auto px-6 pb-12">
        {step === 1 && (
          <StepWelcome onNext={handleWelcomeDone} />
        )}
        {step === 2 && (
          <StepPillarSelect onNext={handlePillarsDone} onBack={back} />
        )}
        {step === 3 && (
          <StepRollercoaster onNext={next} onBack={back} />
        )}
        {step === 4 && (
          <StepGoalSetup
            selectedPillars={state.selectedPillars}
            onNext={handleGoalsDone}
            onBack={back}
          />
        )}
        {step === 5 && (
          <StepConfirmation
            state={state}
            isPending={isPending}
            onConfirm={handleConfirm}
            onBack={back}
          />
        )}
      </div>
    </div>
  )
}
