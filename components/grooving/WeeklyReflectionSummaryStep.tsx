'use client'

// ── Constants ─────────────────────────────────────────────────────────────────

const PILLAR_LABEL: Record<string, string> = {
  spiritual: 'Spiritual', physical: 'Physical',
  nutritional: 'Nutritional', personal: 'Personal', relational: 'Relational',
}
const PILLAR_DOT: Record<string, string> = {
  spiritual: 'bg-purple-400', physical: 'bg-emerald-400',
  nutritional: 'bg-amber-400', personal: 'bg-blue-400', relational: 'bg-teal-400',
}
const PILLAR_BAR: Record<string, string> = {
  spiritual: 'bg-purple-500', physical: 'bg-emerald-500',
  nutritional: 'bg-amber-500', personal: 'bg-blue-500', relational: 'bg-teal-500',
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PillarStat {
  pillar:   string
  thisWeek: number
  prevWeek: number
}

interface Props {
  weekNumber:  number
  pillarStats: PillarStat[]
  onContinue:  () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WeeklyReflectionSummaryStep({ weekNumber, pillarStats, onContinue }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Week {weekNumber} Review</p>
        <p className="text-white font-bold text-base">How did this week go?</p>
      </div>

      <div className="space-y-2">
        {pillarStats.map(({ pillar, thisWeek, prevWeek }) => {
          const delta = thisWeek - prevWeek
          return (
            <div key={pillar} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PILLAR_DOT[pillar] ?? 'bg-slate-500'}`} />
              <span className="text-slate-300 text-xs font-semibold w-24 shrink-0">
                {PILLAR_LABEL[pillar] ?? pillar}
              </span>
              <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${PILLAR_BAR[pillar] ?? 'bg-slate-500'}`}
                  style={{ width: `${Math.round((thisWeek / 7) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-white w-6 text-right shrink-0">{thisWeek}/7</span>
              {weekNumber > 1 && (
                <span className={`text-xs w-8 text-right shrink-0 ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3 bg-violet-700 hover:bg-violet-600 text-white font-bold rounded-2xl transition-colors"
      >
        Continue →
      </button>
    </div>
  )
}
