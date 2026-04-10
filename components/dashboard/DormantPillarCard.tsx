'use client'

import { useState } from 'react'
import Image from 'next/image'
import { PILLAR_CONFIG } from '@/lib/constants'
import type { PillarName } from '@/lib/types'

interface DormantPillarCardProps {
  pillar: PillarName
}

export default function DormantPillarCard({ pillar }: DormantPillarCardProps) {
  const config = PILLAR_CONFIG[pillar]
  const [showNote, setShowNote] = useState(false)

  return (
    <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
      <Image
        src={config.icon}
        alt={config.label}
        width={28}
        height={28}
        className="flex-shrink-0 opacity-40 grayscale"
      />

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-400">{config.label}</p>
          <span className="text-xs bg-slate-200 text-slate-400 px-2 py-0.5 rounded-full">
            Dormant
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">This pillar is waiting.</p>
      </div>

      <div className="flex-shrink-0">
        {showNote ? (
          <span className="text-xs text-slate-400 italic">Coming soon</span>
        ) : (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            Add it →
          </button>
        )}
      </div>
    </div>
  )
}
