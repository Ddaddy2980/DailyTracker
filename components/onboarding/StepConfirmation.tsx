'use client'

import type { PillarName } from '@/lib/types'

interface OnboardingState {
  purposeStatement: string
  selectedPillars: PillarName[]
  goals: Record<string, string>
}

interface Props {
  state:     OnboardingState
  isPending: boolean
  onConfirm: () => void
  onBack:    () => void
}

const PILLAR_LABEL: Record<PillarName, string> = {
  spiritual: 'Spiritual', physical: 'Physical',
  nutritional: 'Nutritional', personal: 'Personal',
}
const PILLAR_COLOR: Record<PillarName, string> = {
  spiritual: 'text-purple-400', physical: 'text-emerald-400',
  nutritional: 'text-amber-400', personal: 'text-blue-400',
}
const PILLAR_CARD: Record<PillarName, string> = {
  spiritual: 'bg-purple-950 border-purple-800',
  physical:  'bg-emerald-950 border-emerald-800',
  nutritional: 'bg-amber-950 border-amber-800',
  personal:  'bg-blue-950 border-blue-800',
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

function fmtDisplay(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function StepConfirmation({ state, isPending, onConfirm, onBack }: Props) {
  const today   = new Intl.DateTimeFormat('en-CA').format(new Date())
  const endDate = addDays(today, 6)

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div className="text-center space-y-3">
        <div className="text-5xl">🎯</div>
        <h2 className="text-2xl font-black">Your 7-day challenge starts today.</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Seven days. One goal at a time. Let&apos;s build something that lasts.
        </p>
      </div>

      {/* Challenge card */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Level 1 — Starter
          </span>
          <span className="text-xs font-bold text-purple-400 bg-purple-950 px-3 py-1 rounded-full">
            7 Days
          </span>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>{fmtDisplay(today)}</span>
          <span className="text-slate-600">→</span>
          <span>{fmtDisplay(endDate)}</span>
        </div>

        <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
          {state.selectedPillars.map(p => (
            <div key={p} className={`rounded-xl border p-3 ${PILLAR_CARD[p]}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${PILLAR_COLOR[p]}`}>
                {PILLAR_LABEL[p]}
              </p>
              <p className="text-white text-sm font-semibold">{state.goals[p]}</p>
            </div>
          ))}
        </div>

        {state.purposeStatement && (
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Your why</p>
            <p className="text-slate-300 text-sm italic">&ldquo;{state.purposeStatement}&rdquo;</p>
          </div>
        )}
      </div>

      <p className="text-center text-slate-500 text-xs leading-relaxed px-2">
        &ldquo;Let us not grow weary in doing good, for at the proper time we will reap a harvest
        if we do not give up.&rdquo; — Galatians 6:9
      </p>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isPending}
          className="px-6 py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl font-bold transition-colors"
        >
          ←
        </button>
        <button
          onClick={onConfirm}
          disabled={isPending}
          className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 rounded-xl font-bold text-lg transition-colors"
        >
          {isPending ? 'Starting your challenge…' : 'Start my challenge →'}
        </button>
      </div>
    </div>
  )
}
