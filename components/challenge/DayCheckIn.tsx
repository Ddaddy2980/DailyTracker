'use client'

import Image from 'next/image'
import type { PillarName } from '@/lib/types'

interface Props {
  pillars:      string[]
  pillarGoals:  Record<string, string>
  completions:  Record<string, boolean>
  isPending:    boolean
  alreadySaved: boolean
  onToggle:     (pillar: string) => void
  onSave:       () => void
}

const PILLAR_UI: Record<PillarName, { label: string; icon: string; card: string }> = {
  spiritual:   { label: 'Spiritual',   icon: '/Spiritual_Icon_Bk.png',   card: 'pillar-spiritual'   },
  physical:    { label: 'Physical',    icon: '/Physical_Icon_Bk.png',    card: 'pillar-physical'    },
  nutritional: { label: 'Nutritional', icon: '/Nutritional_Icon_Bk.png', card: 'pillar-nutritional' },
  personal:    { label: 'Personal',    icon: '/Personal_Icon_Bk.png',    card: 'pillar-personal'    },
}

const DEFAULT_UI = { label: 'Goal', icon: '', card: 'bg-gray-700' }

export default function DayCheckIn({
  pillars, pillarGoals, completions, isPending, alreadySaved, onToggle, onSave,
}: Props) {
  const allDone = pillars.every(p => completions[p])
  const anyDone = pillars.some(p => completions[p])

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
        Today&apos;s Goals
      </p>

      {pillars.map(pillar => {
        const ui       = PILLAR_UI[pillar as PillarName] ?? DEFAULT_UI
        const complete = completions[pillar] ?? false
        const goal     = pillarGoals[pillar] ?? ''

        return (
          <button
            key={pillar}
            onClick={() => onToggle(pillar)}
            disabled={alreadySaved && !complete}
            className={`w-full text-left p-4 rounded-2xl border-2 border-transparent transition-all active:scale-95 ${ui.card}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                complete
                  ? 'bg-emerald-500 border-emerald-400'
                  : 'border-white/60 bg-transparent'
              }`}>
                {complete && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {ui.icon && (
                    <Image
                      src={ui.icon}
                      width={20}
                      height={20}
                      alt={ui.label}
                      className="invert"
                    />
                  )}
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white">
                    {ui.label}
                  </p>
                </div>
                <p className="text-sm font-semibold leading-snug text-white">
                  {goal}
                </p>
              </div>
            </div>
          </button>
        )
      })}

      {!alreadySaved && (
        <button
          onClick={onSave}
          disabled={!anyDone || isPending}
          className="w-full py-4 mt-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-lg text-white transition-colors"
        >
          {isPending ? 'Saving…' : allDone ? 'Save today ✓' : 'Save progress'}
        </button>
      )}
    </div>
  )
}
