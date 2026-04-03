'use client'

import { useState } from 'react'
import type { PillarName } from '@/lib/types'

interface Props {
  selectedPillars: PillarName[]
  onNext: (goals: Record<string, string>) => void
  onBack: () => void
}

type ActKey = 'actA' | 'actC' | 'actT'

interface PillarGoalState {
  text: string
  actA: boolean
  actC: boolean
  actT: boolean
}

const PILLAR_LABEL: Record<PillarName, string> = {
  spiritual: 'Spiritual', physical: 'Physical',
  nutritional: 'Nutritional', personal: 'Personal', missional: 'Missional',
}
const PILLAR_COLOR: Record<PillarName, string> = {
  spiritual: 'text-purple-400', physical: 'text-emerald-400',
  nutritional: 'text-amber-400', personal: 'text-blue-400', missional: 'text-teal-400',
}
const PILLAR_BORDER: Record<PillarName, string> = {
  spiritual: 'border-purple-500', physical: 'border-emerald-500',
  nutritional: 'border-amber-500', personal: 'border-blue-500', missional: 'border-teal-500',
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
const ACT_ITEMS: { key: ActKey; letter: string; label: string; desc: string }[] = [
  { key: 'actA', letter: 'A', label: 'Attainable', desc: 'Can I do this on my worst day of the year?' },
  { key: 'actC', letter: 'C', label: 'Challenging', desc: 'Does it require real intention and effort?' },
  { key: 'actT', letter: 'T', label: 'Trackable',   desc: 'Is there a clear, binary way to confirm it?' },
]

export default function StepGoalSetup({ selectedPillars, onNext, onBack }: Props) {
  const [pillarIndex, setPillarIndex] = useState(0)
  const [goalStates, setGoalStates] = useState<Record<string, PillarGoalState>>(
    Object.fromEntries(
      selectedPillars.map(p => [p, { text: '', actA: false, actC: false, actT: false }])
    )
  )

  const currentPillar = selectedPillars[pillarIndex]
  const current       = goalStates[currentPillar]
  const isLastPillar  = pillarIndex === selectedPillars.length - 1
  const canContinue   = current.text.trim().length > 5 && current.actA && current.actC && current.actT

  function update(patch: Partial<PillarGoalState>) {
    setGoalStates(s => ({ ...s, [currentPillar]: { ...s[currentPillar], ...patch } }))
  }

  function handleNext() {
    if (isLastPillar) {
      onNext(Object.fromEntries(Object.entries(goalStates).map(([k, v]) => [k, v.text.trim()])))
    } else {
      setPillarIndex(i => i + 1)
    }
  }

  return (
    <div className="flex flex-col gap-5 pt-8">
      {selectedPillars.length > 1 && (
        <div className="flex gap-2">
          {selectedPillars.map((p, i) => (
            <div key={p} className={`flex-1 h-1 rounded-full transition-colors ${i <= pillarIndex ? 'bg-purple-500' : 'bg-slate-700'}`} />
          ))}
        </div>
      )}

      <div className="space-y-1">
        <p className={`text-xs font-bold uppercase tracking-widest ${PILLAR_COLOR[currentPillar]}`}>
          {PILLAR_LABEL[currentPillar]} Goal
        </p>
        <h2 className="text-2xl font-black">Set a goal you can hit every single day</h2>
        <p className="text-slate-400 text-sm">Pick a suggestion or write your own. It must pass the ACT test.</p>
      </div>

      <div className="flex flex-col gap-2">
        {SUGGESTIONS[currentPillar].map(s => (
          <button
            key={s}
            onClick={() => update({ text: s })}
            className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
              current.text === s
                ? `bg-slate-800 ${PILLAR_BORDER[currentPillar]} text-white font-semibold`
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Or write your own</label>
        <input
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:border-purple-500 transition-colors"
          placeholder="e.g. Pray for 5 minutes each morning"
          value={current.text}
          onChange={e => update({ text: e.target.value })}
        />
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">The ACT Test — check all three</p>
        {ACT_ITEMS.map(({ key, letter, label, desc }) => (
          <label key={key} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 accent-purple-500 flex-shrink-0"
              checked={current[key]}
              onChange={e => update({ [key]: e.target.checked })}
            />
            <div>
              <span className="font-bold text-sm">
                <span className="text-purple-400">{letter}</span> — {label}
              </span>
              <p className="text-slate-400 text-xs mt-0.5">{desc}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={pillarIndex === 0 ? onBack : () => setPillarIndex(i => i - 1)}
          className="px-6 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors"
        >
          ←
        </button>
        <button
          onClick={handleNext}
          disabled={!canContinue}
          className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-colors"
        >
          {isLastPillar
            ? 'Review my challenge →'
            : `Next: ${PILLAR_LABEL[selectedPillars[pillarIndex + 1]]} →`}
        </button>
      </div>
    </div>
  )
}
