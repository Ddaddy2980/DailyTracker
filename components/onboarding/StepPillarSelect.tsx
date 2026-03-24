'use client'

import { useState } from 'react'
import type { PillarName } from '@/lib/types'

interface Props {
  onNext: (pillars: PillarName[]) => void
  onBack: () => void
}

interface PillarOption {
  id: PillarName
  label: string
  description: string
  color: string
  selectedBg: string
  selectedBorder: string
}

const PILLARS: PillarOption[] = [
  {
    id: 'spiritual',
    label: 'Spiritual',
    description: 'Faith, reflection, connection to God',
    color: 'text-purple-400',
    selectedBg: 'bg-purple-950',
    selectedBorder: 'border-purple-500',
  },
  {
    id: 'physical',
    label: 'Physical',
    description: 'Body stewardship, movement, health',
    color: 'text-emerald-400',
    selectedBg: 'bg-emerald-950',
    selectedBorder: 'border-emerald-500',
  },
  {
    id: 'nutritional',
    label: 'Nutritional',
    description: 'Fueling the body well',
    color: 'text-amber-400',
    selectedBg: 'bg-amber-950',
    selectedBorder: 'border-amber-500',
  },
  {
    id: 'personal',
    label: 'Personal',
    description: 'Whole-person development',
    color: 'text-blue-400',
    selectedBg: 'bg-blue-950',
    selectedBorder: 'border-blue-500',
  },
]

export default function StepPillarSelect({ onNext, onBack }: Props) {
  const [selected, setSelected] = useState<PillarName[]>([])

  function toggle(id: PillarName) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id)
      if (prev.length >= 2) return prev   // Level 1 max: 2 pillars
      return [...prev, id]
    })
  }

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-black leading-snug">
          Which area of your life feels most neglected right now?
        </h2>
        <p className="text-slate-400 text-sm">
          Choose 1 or 2. Be honest — this is just between you and you.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {PILLARS.map(p => {
          const isSelected = selected.includes(p.id)
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? `${p.selectedBg} ${p.selectedBorder}`
                  : 'bg-slate-900 border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className={`font-bold ${isSelected ? p.color : 'text-white'}`}>
                {p.label}
              </div>
              <div className="text-slate-400 text-sm mt-0.5">{p.description}</div>
            </button>
          )
        })}
      </div>

      {selected.length === 2 && (
        <p className="text-xs text-slate-500 text-center">
          Level 1 focuses on 1–2 pillars. You can add more as you level up.
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors"
        >
          ←
        </button>
        <button
          onClick={() => onNext(selected)}
          disabled={selected.length === 0}
          className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
