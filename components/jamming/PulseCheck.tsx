'use client'

import { useState, useTransition } from 'react'
import { recordPulseCheck } from '@/app/actions'
import type { PulseState, PulseTrigger } from '@/lib/types'

interface Props {
  challengeId: string
  weekNumber:  number
  triggerType: PulseTrigger
  onDone:      () => void
}

interface PulseOption {
  state:    PulseState
  label:    string
  body:     string
  icon:     string
  selected: string
  idle:     string
}

const OPTIONS: PulseOption[] = [
  {
    state:    'smooth_sailing',
    label:    'Smooth Sailing',
    body:     "I've got this. Habits are forming.",
    icon:     '⛵',
    selected: 'bg-emerald-950 border-emerald-500 ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-950',
    idle:     'bg-slate-900 border-slate-700 hover:border-slate-500',
  },
  {
    state:    'rough_waters',
    label:    'Rough Waters',
    body:     "It's hard but I'm still in it.",
    icon:     '🌊',
    selected: 'bg-amber-950 border-amber-500 ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-950',
    idle:     'bg-slate-900 border-slate-700 hover:border-slate-500',
  },
  {
    state:    'taking_on_water',
    label:    'Taking On Water',
    body:     "I'm struggling and close to quitting.",
    icon:     '🆘',
    selected: 'bg-red-950 border-red-500 ring-2 ring-red-500 ring-offset-2 ring-offset-slate-950',
    idle:     'bg-slate-900 border-slate-700 hover:border-slate-500',
  },
]

const TRIGGER_LABEL: Record<PulseTrigger, string> = {
  scheduled_weekly:   `Weekly check-in`,
  missed_day:         'Yesterday slipped',
  partial_completion: 'Mid-week check',
}

const TRIGGER_PROMPT: Record<PulseTrigger, string> = {
  scheduled_weekly:   'How are you feeling about the challenge right now?',
  missed_day:         'Yesterday slipped — it happens. How are you feeling about the challenge?',
  partial_completion: "You've had a couple of partial days. How are you doing?",
}

export default function PulseCheck({ challengeId, weekNumber, triggerType, onDone }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected]      = useState<PulseState | null>(null)

  function handleSubmit() {
    if (!selected) return
    startTransition(async () => {
      await recordPulseCheck({
        challengeId,
        weekNumber,
        pulseState:  selected,
        triggerType,
      })
      onDone()
    })
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4">

      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-400">
          {TRIGGER_LABEL[triggerType]}
        </p>
        <p className="text-white font-bold text-base leading-snug">
          {TRIGGER_PROMPT[triggerType]}
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {OPTIONS.map(opt => (
          <button
            key={opt.state}
            onClick={() => setSelected(opt.state)}
            className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
              selected === opt.state ? opt.selected : opt.idle
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{opt.icon}</span>
              <div>
                <p className={`font-black text-sm ${selected === opt.state ? 'text-white' : 'text-slate-300'}`}>
                  {opt.label}
                </p>
                <p className={`text-xs mt-0.5 ${selected === opt.state ? 'text-slate-300' : 'text-slate-500'}`}>
                  {opt.body}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!selected || isPending}
        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-white transition-colors"
      >
        {isPending ? 'Saving…' : 'Submit →'}
      </button>

    </div>
  )
}
