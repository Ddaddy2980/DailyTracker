'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeJammingOnboarding } from '@/app/actions'
import type { PillarName } from '@/lib/types'
import JammingStepPillar  from '@/components/jamming/onboarding/JammingStepPillar'
import JammingStepWarning from '@/components/jamming/onboarding/JammingStepWarning'

interface Props {
  durationDays:      14 | 21
  existingPillars:   string[]
  existingGoals:     Record<string, string>
  purposeStatement:  string
}

const ALL_PILLARS: PillarName[] = ['spiritual', 'physical', 'nutritional', 'personal']
const TOTAL_STEPS = 2

export default function JammingOnboardingFlow({
  durationDays, existingPillars, existingGoals, purposeStatement,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep]     = useState(1)
  const [newPillar, setNewPillar] = useState<PillarName | null>(null)
  const [newGoal,   setNewGoal]   = useState('')

  const availablePillars = ALL_PILLARS.filter(p => !existingPillars.includes(p))

  function handlePillarDone(pillar: PillarName, goal: string) {
    setNewPillar(pillar)
    setNewGoal(goal)
    setStep(2)
  }

  function handleConfirm(data: {
    purposeStatement:             string
    accountabilityPartnerName:    string | null
    accountabilityPartnerContact: string | null
  }) {
    if (!newPillar) return

    const allPillars  = [...existingPillars, newPillar]
    const pillarGoals = { ...existingGoals, [newPillar]: newGoal }

    startTransition(async () => {
      await completeJammingOnboarding({
        durationDays,
        allPillars,
        pillarGoals,
        purposeStatement:             data.purposeStatement,
        accountabilityPartnerName:    data.accountabilityPartnerName,
        accountabilityPartnerContact: data.accountabilityPartnerContact,
      })
      router.push('/jamming')
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
          <JammingStepPillar
            availablePillars={availablePillars}
            onNext={handlePillarDone}
            onBack={() => router.back()}
          />
        )}
        {step === 2 && (
          <JammingStepWarning
            purposeStatement={purposeStatement}
            isPending={isPending}
            onConfirm={handleConfirm}
            onBack={() => setStep(1)}
          />
        )}
      </div>
    </div>
  )
}
