'use client'

import { useState } from 'react'
import type { PillarName } from '@/lib/types'

interface Props {
  availablePillars: PillarName[]   // pillars NOT already in Tuning
  onNext: (pillar: PillarName, goal: string) => void
  onBack: () => void
}

const PILLAR_LABEL: Record<PillarName, string> = {
  spiritual: 'Spiritual', physical: 'Physical',
  nutritional: 'Nutritional', personal: 'Personal', missional: 'Missional',
}
const PILLAR_COLOR: Record<PillarName, string> = {
  spiritual: 'text-purple-400', physical: 'text-emerald-400',
  nutritional: 'text-amber-400', personal: 'text-blue-400', missional: 'text-teal-400',
}
const PILLAR_BORDER_ACTIVE: Record<PillarName, string> = {
  spiritual: 'border-purple-500 bg-purple-950',
  physical:  'border-emerald-500 bg-emerald-950',
  nutritional: 'border-amber-500 bg-amber-950',
  personal:  'border-blue-500 bg-blue-950',
  missional: 'border-teal-500 bg-teal-950',
}
const PILLAR_DESCRIPTION: Record<PillarName, string> = {
  spiritual:   'Your spiritual life is the foundation of everything else.',
  physical:    'Your body is not separate from your purpose.',
  nutritional: 'What you eat is what you become.',
  personal:    'You are more than your to-do list.',
  missional:   'Living out your calling in the world.',
}
const SUGGESTIONS: Record<PillarName, string[]> = {
  spiritual: [
    'Read one chapter of Scripture every day',
    'Spend 10 minutes in prayer each morning',
    'Write one sentence of gratitude each day',
    'Read a daily devotional every morning',
  ],
  physical: [
    'Walk for 20 minutes every day',
    'Exercise for 30 minutes daily',
    'Get at least 7 hours of sleep each night',
    'Do 10 minutes of stretching each morning',
  ],
  nutritional: [
    'Eat a vegetable with every meal',
    'Drink 64 oz of water every day',
    'Eat no added sugar after 7:00 PM',
    'Eat a healthy breakfast every morning',
  ],
  personal: [
    'Read for 20 minutes every day',
    'Write in a journal each morning',
    'Spend 15 minutes learning something new',
    'Reflect for 10 minutes before bed',
  ],
  missional: [
    'Reach out to one person in your network each day',
    'Spend 15 minutes on your calling each morning',
    'Write one sentence about your impact each day',
    'Do one act of service every day',
  ],
}

export default function JammingStepPillar({ availablePillars, onNext, onBack }: Props) {
  const [selectedPillar, setSelectedPillar] = useState<PillarName>(availablePillars[0])
  const [goal, setGoal]       = useState('')
  const [actA, setActA]       = useState(false)

  const canContinue = goal.trim().length > 5 && actA

  function handlePillarChange(p: PillarName) {
    setSelectedPillar(p)
    setGoal('')
    setActA(false)
  }

  return (
    <div className="flex flex-col gap-5 pt-8">

      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-400">Second Pillar</p>
        <h2 className="text-2xl font-black">Add one more area of your life</h2>
        <p className="text-slate-400 text-sm">
          One goal. Same standard as before — something you can hit every single day.
        </p>
      </div>

      {/* Pillar selector */}
      <div className="grid grid-cols-2 gap-2">
        {availablePillars.map(p => (
          <button
            key={p}
            onClick={() => handlePillarChange(p)}
            className={`rounded-2xl border-2 p-4 text-left transition-all ${
              selectedPillar === p
                ? PILLAR_BORDER_ACTIVE[p]
                : 'border-slate-700 bg-slate-900 hover:border-slate-600'
            }`}
          >
            <p className={`text-xs font-black uppercase tracking-widest mb-1 ${
              selectedPillar === p ? PILLAR_COLOR[p] : 'text-slate-500'
            }`}>
              {PILLAR_LABEL[p]}
            </p>
            <p className="text-[11px] text-slate-400 leading-snug">
              {PILLAR_DESCRIPTION[p]}
            </p>
          </button>
        ))}
      </div>

      {/* Goal suggestions */}
      <div className="flex flex-col gap-2">
        {SUGGESTIONS[selectedPillar].map(s => (
          <button
            key={s}
            onClick={() => setGoal(s)}
            className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
              goal === s
                ? `bg-slate-800 ${PILLAR_BORDER_ACTIVE[selectedPillar].split(' ')[0].replace('bg-', 'border-').replace('950', '500')} text-white font-semibold`
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Custom goal */}
      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Or write your own</label>
        <input
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:border-purple-500 transition-colors"
          placeholder="e.g. Walk for 20 minutes every day"
          value={goal}
          onChange={e => setGoal(e.target.value)}
        />
      </div>

      {/* Lighter ACT — one question only */}
      <label className="flex items-start gap-3 cursor-pointer bg-slate-900 border border-slate-700 rounded-xl p-4">
        <input
          type="checkbox"
          className="mt-0.5 w-4 h-4 accent-purple-500 flex-shrink-0"
          checked={actA}
          onChange={e => setActA(e.target.checked)}
        />
        <div>
          <span className="font-bold text-sm">
            <span className="text-purple-400">A</span> — Attainable
          </span>
          <p className="text-slate-400 text-xs mt-0.5">Can I do this on the worst day of the year?</p>
        </div>
      </label>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors"
        >
          ←
        </button>
        <button
          onClick={() => onNext(selectedPillar, goal.trim())}
          disabled={!canContinue}
          className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-colors"
        >
          Next →
        </button>
      </div>

    </div>
  )
}
