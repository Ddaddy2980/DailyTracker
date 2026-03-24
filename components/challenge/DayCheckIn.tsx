'use client'

import type { PillarName } from '@/lib/types'

interface Props {
  pillars:        string[]
  pillarGoals:    Record<string, string>
  completions:    Record<string, boolean>
  isPending:      boolean
  alreadySaved:   boolean
  onToggle:       (pillar: string) => void
  onSave:         () => void
}

const PILLAR_UI: Record<PillarName, { label: string; color: string; card: string; check: string }> = {
  spiritual:   { label: 'Spiritual',   color: 'text-purple-400', card: 'border-purple-800 bg-purple-950', check: 'bg-purple-600 border-purple-500' },
  physical:    { label: 'Physical',    color: 'text-emerald-400', card: 'border-emerald-800 bg-emerald-950', check: 'bg-emerald-600 border-emerald-500' },
  nutritional: { label: 'Nutritional', color: 'text-amber-400',  card: 'border-amber-800 bg-amber-950',  check: 'bg-amber-600 border-amber-500'  },
  personal:    { label: 'Personal',    color: 'text-blue-400',   card: 'border-blue-800 bg-blue-950',    check: 'bg-blue-600 border-blue-500'    },
}

const DEFAULT_UI = { label: 'Goal', color: 'text-slate-400', card: 'border-slate-700 bg-slate-900', check: 'bg-slate-600 border-slate-500' }

export default function DayCheckIn({
  pillars, pillarGoals, completions, isPending, alreadySaved, onToggle, onSave,
}: Props) {
  const allDone = pillars.every(p => completions[p])

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
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
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-95 ${
              complete
                ? `${ui.card} border-opacity-100`
                : 'bg-slate-900 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Check circle */}
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                complete ? ui.check : 'border-slate-600 bg-transparent'
              }`}>
                {complete && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-bold uppercase tracking-wider mb-0.5 ${ui.color}`}>
                  {ui.label}
                </p>
                <p className={`text-sm font-semibold leading-snug ${complete ? 'text-white' : 'text-slate-300'}`}>
                  {goal}
                </p>
              </div>
            </div>
          </button>
        )
      })}

      {/* Save button */}
      {!alreadySaved && (
        <button
          onClick={onSave}
          disabled={!allDone || isPending}
          className="w-full py-4 mt-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-colors"
        >
          {isPending ? 'Saving…' : allDone ? 'Save today ✓' : 'Check off your goals above'}
        </button>
      )}
    </div>
  )
}
