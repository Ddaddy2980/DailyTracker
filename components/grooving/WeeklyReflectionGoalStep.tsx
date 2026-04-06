'use client'

import type { DestinationGoal, DestinationGoalCheckInStatus } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const PILLAR_LABEL: Record<string, string> = {
  spiritual: 'Spiritual', physical: 'Physical',
  nutritional: 'Nutritional', personal: 'Personal', relational: 'Relational',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  activeGoals:          DestinationGoal[]
  goalStatus:           DestinationGoalCheckInStatus | null
  onGoalStatusChange:   (s: DestinationGoalCheckInStatus) => void
  shareCircle:          boolean
  onShareCircleChange:  (v: boolean) => void
  hasAnswer:            boolean
  isPending:            boolean
  continueLabel:        string
  onContinue:           () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WeeklyReflectionGoalStep({
  activeGoals, goalStatus, onGoalStatusChange,
  shareCircle, onShareCircleChange,
  hasAnswer, isPending, continueLabel, onContinue,
}: Props) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Direction check</p>
        <p className="text-white font-bold text-base leading-snug">
          Are you still moving toward your destination goal{activeGoals.length > 1 ? 's' : ''}?
        </p>
      </div>

      <div className="space-y-1.5">
        {activeGoals.map(g => (
          <p key={g.id} className="text-slate-400 text-sm leading-snug">
            <span className="text-slate-500 text-xs uppercase tracking-wide">{PILLAR_LABEL[g.pillar] ?? g.pillar}: </span>
            {g.goal_name}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {([
          { value: 'yes',    label: 'Yes — I can feel it',         icon: '✅' },
          { value: 'slowly', label: "Slowly — but I haven't quit", icon: '🐢' },
          { value: 'no',     label: 'Not really right now',         icon: '🔄' },
        ] as { value: DestinationGoalCheckInStatus; label: string; icon: string }[]).map(opt => (
          <button
            key={opt.value}
            onClick={() => onGoalStatusChange(opt.value)}
            className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
              goalStatus === opt.value
                ? 'bg-emerald-950 border-emerald-500 ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-950'
                : 'bg-slate-900 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{opt.icon}</span>
              <p className={`font-semibold text-sm ${goalStatus === opt.value ? 'text-white' : 'text-slate-300'}`}>{opt.label}</p>
            </div>
          </button>
        ))}
      </div>

      {hasAnswer && (
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            role="checkbox"
            aria-checked={shareCircle}
            onClick={() => onShareCircleChange(!shareCircle)}
            className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${
              shareCircle ? 'bg-violet-600' : 'bg-slate-700'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${shareCircle ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <span className="text-slate-400 text-xs leading-snug">
            Share one sentence from my reflection with my Grooving Circle
          </span>
        </label>
      )}

      <button
        onClick={onContinue}
        disabled={!goalStatus || isPending}
        className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-white transition-colors"
      >
        {isPending ? 'Saving…' : continueLabel}
      </button>
    </div>
  )
}
