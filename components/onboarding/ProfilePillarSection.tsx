'use client'

import { PILLAR_CONFIG } from '@/lib/constants'
import type { PillarQuestions } from '@/lib/constants/consistencyProfileQuestions'
import ProfileQuestion from '@/components/onboarding/ProfileQuestion'

interface ProfilePillarSectionProps {
  pillarQ: PillarQuestions
  answers: (number | null)[]
  onChange: (qIdx: number, value: number) => void
}

export default function ProfilePillarSection({
  pillarQ,
  answers,
  onChange,
}: ProfilePillarSectionProps) {
  const config = PILLAR_CONFIG[pillarQ.pillar]

  return (
    <div className="w-full">
      {/* Pillar header */}
      <div
        className="flex items-center gap-3 rounded-xl px-5 py-4 mb-6"
        style={{ backgroundColor: config.background }}
      >
        <span className="text-2xl" role="img" aria-label={pillarQ.label}>
          {pillarQ.emoji}
        </span>
        <div>
          <p className="font-bold text-white text-base">{pillarQ.label}</p>
          <p className="text-xs" style={{ color: config.subtitle }}>
            Answer all four questions to continue
          </p>
        </div>
      </div>

      {/* Questions */}
      {pillarQ.questions.map((q, idx) => (
        <ProfileQuestion
          key={q.dimension}
          question={q}
          value={answers[idx] ?? null}
          onChange={(v) => onChange(idx, v)}
        />
      ))}
    </div>
  )
}
