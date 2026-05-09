import Image from 'next/image'
import { PILLAR_CONFIG, LEVEL_NAMES } from '@/lib/constants'
import type { PillarName, LevelNumber } from '@/lib/types'

export interface PillarStat {
  pillar:        PillarName
  level:         LevelNumber
  completionPct: number
}

export default function PillarStatRow({ pillar, level, completionPct }: PillarStat) {
  const config = PILLAR_CONFIG[pillar]

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        backgroundColor: config.background,
        backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)',
        boxShadow: '0 4px 0 rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)',
      }}
    >
      <Image
        src={config.icon}
        alt={config.label}
        width={28}
        height={28}
        className="flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight" style={{ color: config.title }}>
          {config.label}
        </p>
        <p className="text-xs" style={{ color: config.subtitle }}>
          {LEVEL_NAMES[level]}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-lg font-bold leading-tight" style={{ color: config.title }}>
          {completionPct}%
        </p>
        <p className="text-xs" style={{ color: config.subtitle }}>
          consistent
        </p>
      </div>
    </div>
  )
}
