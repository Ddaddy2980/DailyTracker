'use client'

// DestinationGoalCheckIn
//
// Per-goal progress question used in the weekly reflection flow (Step 25).
// Built here so Step 25 can import it without changes to this file.
// Not wired into the dashboard directly — used by WeeklyReflection.

import type { DestinationGoal } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type DestinationProgressAnswer = 'yes' | 'slowly' | 'no'

interface AnswerOption {
  value: DestinationProgressAnswer
  label: string
  sub:   string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PILLAR_LABEL: Record<string, string> = {
  spiritual: 'Spiritual', physical: 'Physical',
  nutritional: 'Nutritional', personal: 'Personal',
}

const PILLAR_COLOR: Record<string, string> = {
  spiritual: 'text-purple-400', physical: 'text-emerald-400',
  nutritional: 'text-amber-400', personal: 'text-blue-400',
}

const PILLAR_RING: Record<string, string> = {
  spiritual:   'ring-purple-600',
  physical:    'ring-emerald-600',
  nutritional: 'ring-amber-600',
  personal:    'ring-blue-600',
}

const ANSWERS: AnswerOption[] = [
  { value: 'yes',    label: 'Yes',      sub: 'I feel real movement'       },
  { value: 'slowly', label: 'Slowly',   sub: 'It\'s happening, but slow'  },
  { value: 'no',     label: 'Not yet',  sub: 'No visible progress yet'    },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  goal:      DestinationGoal
  selected?: DestinationProgressAnswer | null
  onAnswer:  (answer: DestinationProgressAnswer) => void
  isPending?: boolean
}

export default function DestinationGoalCheckIn({ goal, selected, onAnswer, isPending }: Props) {
  const ringColor = PILLAR_RING[goal.pillar] ?? 'ring-violet-600'

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4">

      {/* Goal identity */}
      <div>
        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${PILLAR_COLOR[goal.pillar] ?? 'text-slate-400'}`}>
          {PILLAR_LABEL[goal.pillar] ?? goal.pillar} Direction
        </p>
        <p className="text-white text-sm font-semibold leading-snug">{goal.goal_name}</p>
      </div>

      {/* Question */}
      <p className="text-slate-400 text-sm">
        This week — are you moving toward this?
      </p>

      {/* Three-state answer buttons */}
      <div className="grid grid-cols-3 gap-2">
        {ANSWERS.map(a => {
          const isSelected = selected === a.value
          return (
            <button
              key={a.value}
              onClick={() => onAnswer(a.value)}
              disabled={isPending}
              className={`flex flex-col items-center py-3 px-2 rounded-xl text-center transition-colors
                disabled:opacity-50 border
                ${isSelected
                  ? `bg-slate-700 border-slate-500 ring-2 ${ringColor}`
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                }`}
            >
              <span className="text-white text-sm font-bold">{a.label}</span>
              <span className="text-slate-500 text-xs mt-0.5 leading-tight">{a.sub}</span>
            </button>
          )
        })}
      </div>

    </div>
  )
}
