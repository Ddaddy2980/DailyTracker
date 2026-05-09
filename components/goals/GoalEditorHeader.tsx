import Image from 'next/image'
import { PILLAR_CONFIG, LEVEL_NAMES } from '@/lib/constants'
import type { PillarName, LevelNumber } from '@/lib/types'

interface GoalEditorHeaderProps {
  pillar:     PillarName
  level:      LevelNumber
  showToggle: boolean
  isActive:   boolean
  onToggle?:  () => void
}

export default function GoalEditorHeader({
  pillar,
  level,
  showToggle,
  isActive,
  onToggle,
}: GoalEditorHeaderProps) {
  const config = PILLAR_CONFIG[pillar]

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
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

      {showToggle && (
        <button
          type="button"
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
      )}
    </div>
  )
}
