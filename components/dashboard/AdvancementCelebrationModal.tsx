'use client'

import Image from 'next/image'
import { PILLAR_CONFIG, LEVEL_NAMES, ADVANCEMENT_MESSAGES } from '@/lib/constants'
import type { PillarName, LevelNumber } from '@/lib/types'

interface AdvancementCelebrationModalProps {
  pillar:     PillarName
  newLevel:   LevelNumber
  onDismiss:  () => void
}

export default function AdvancementCelebrationModal({
  pillar,
  newLevel,
  onDismiss,
}: AdvancementCelebrationModalProps) {
  const config = PILLAR_CONFIG[pillar]
  // newLevel for an advancement is always 2, 3, or 4 (level 1 is the start state).
  const message = ADVANCEMENT_MESSAGES[newLevel as 2 | 3 | 4]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/70 animate-fadeIn">
      <div
        className="relative w-full max-w-sm rounded-3xl px-8 py-10 text-center shadow-2xl animate-zoomIn"
        style={{ backgroundColor: config.background }}
      >
        <p
          className="text-xs font-semibold tracking-widest uppercase mb-4"
          style={{ color: config.subtitle }}
        >
          {config.label}
        </p>

        <div
          className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: config.saveButton }}
        >
          <Image src={config.icon} alt={config.label} width={56} height={56} />
        </div>

        <p className="text-sm font-semibold mb-1" style={{ color: config.subtitle }}>
          You&rsquo;ve advanced to
        </p>
        <p className="text-4xl font-bold mb-4" style={{ color: config.title }}>
          {LEVEL_NAMES[newLevel]}
        </p>

        <p className="text-base leading-relaxed mb-8" style={{ color: config.title }}>
          {message}
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-4 rounded-2xl font-bold text-base shadow-[0_4px_0_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 transition-all duration-75 text-white"
          style={{ backgroundColor: config.saveButton }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
