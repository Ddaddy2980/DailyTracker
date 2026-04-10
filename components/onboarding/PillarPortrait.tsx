'use client'

import Image from 'next/image'
import { PILLAR_CONFIG, PILLAR_ORDER, LEVEL_NAMES, LEVEL_STATUS_PHRASES } from '@/lib/constants'
import type { PillarLevel, LevelNumber } from '@/lib/types'

interface PillarPortraitProps {
  pillarLevels: PillarLevel[]
  onContinue: () => void
}

export default function PillarPortrait({ pillarLevels, onContinue }: PillarPortraitProps) {
  const levelMap = Object.fromEntries(
    pillarLevels.map((pl) => [pl.pillar, pl.level as LevelNumber])
  ) as Record<string, LevelNumber>

  return (
    <div className="w-full max-w-lg mt-6">
      <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
        Your Consistency Profile
      </h1>
      <p className="text-slate-500 text-center text-sm mb-8">
        Here&apos;s where you&apos;re starting in each pillar.
      </p>

      <div className="flex flex-col gap-3 mb-6">
        {PILLAR_ORDER.map((pillar) => {
          const config = PILLAR_CONFIG[pillar]
          const level = levelMap[pillar] ?? 1
          const levelName = LEVEL_NAMES[level]
          const statusPhrase = LEVEL_STATUS_PHRASES[level]

          return (
            <div
              key={pillar}
              className="flex items-center gap-4 rounded-xl px-4 py-3"
              style={{ backgroundColor: config.background }}
            >
              {/* Icon */}
              <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                <Image
                  src={config.icon}
                  alt={config.label}
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>

              {/* Label + status */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{config.label}</p>
                <p className="text-xs" style={{ color: config.subtitle }}>
                  {statusPhrase}
                </p>
              </div>

              {/* Level badge */}
              <span
                className="shrink-0 text-xs font-bold px-2 py-1 rounded-lg"
                style={{ color: config.title, backgroundColor: 'rgba(0,0,0,0.2)' }}
              >
                {levelName}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-sm text-slate-500 text-center mb-6">
        Every pillar starts where you are — not where you wish you were. That&apos;s what makes this work.
      </p>

      <button
        onClick={onContinue}
        className="w-full py-3 rounded-xl font-semibold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors"
      >
        Set Up My Goals →
      </button>
    </div>
  )
}
