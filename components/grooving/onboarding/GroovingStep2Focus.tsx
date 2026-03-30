'use client'

// Thin wrapper that renders FocusExercise within the Grooving onboarding layout.
// All exercise logic lives in FocusExercise.tsx.

import FocusExercise from '@/components/grooving/FocusExercise'
import type { FocusTop5Item } from '@/lib/types'

interface Props {
  onNext: (data: { focusList25: string[]; focusTop5: FocusTop5Item[] }) => void
  onBack: () => void
  onSkip: () => void
}

export default function GroovingStep2Focus({ onNext, onBack, onSkip }: Props) {
  return (
    <FocusExercise
      onComplete={onNext}
      onBack={onBack}
      onSkip={onSkip}
    />
  )
}
