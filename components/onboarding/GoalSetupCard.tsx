'use client'

import Image from 'next/image'
import { PILLAR_CONFIG, LEVEL_NAMES } from '@/lib/constants'
import type { PillarName, LevelNumber } from '@/lib/types'

interface GoalSetupCardProps {
  pillar:     PillarName
  level:      LevelNumber
  goalText:   string
  isActive:   boolean
  onChange:   (text: string) => void
  onToggle:   () => void
}

export default function GoalSetupCard({
  pillar,
  level,
  goalText,
  isActive,
  onChange,
  onToggle,
}: GoalSetupCardProps) {
  const config = PILLAR_CONFIG[pillar]

  return (
    <div
      className="rounded-xl overflow-hidden mb-3"
      style={{ backgroundColor: config.background }}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
          <Image
            src={config.icon}
            alt={config.label}
            width={32}
            height={32}
            className="object-contain"
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">{config.label}</p>
          <p className="text-xs" style={{ color: config.subtitle }}>
            {LEVEL_NAMES[level]}
          </p>
        </div>

        {/* Toggle */}
        <button
          onClick={onToggle}
          className={[
            'shrink-0 text-xs font-semibold px-3 py-1 rounded-full border transition-colors',
            isActive
              ? 'bg-white text-slate-800 border-white'
              : 'bg-transparent text-white border-white/40 hover:border-white/70',
          ].join(' ')}
        >
          {isActive ? 'Active' : 'Leave dormant'}
        </button>
      </div>

      {/* Goal input — only shown when active */}
      {isActive && (
        <div className="px-4 pb-4">
          <input
            type="text"
            value={goalText}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`e.g. 'Read my Bible for 10 minutes every day'`}
            className="w-full rounded-lg px-3 py-2.5 text-sm bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50 transition-colors"
          />
        </div>
      )}
    </div>
  )
}
