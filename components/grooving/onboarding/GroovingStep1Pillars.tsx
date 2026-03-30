'use client'

import { useState, useTransition } from 'react'
import { markVideoWatched } from '@/app/actions'
import { VIDEO_LIBRARY } from '@/lib/constants'
import VideoCard from '@/components/challenge/VideoCard'
import type { PillarName } from '@/lib/types'

interface Props {
  durationDays:    30 | 50 | 66
  existingPillars: string[]
  existingGoals:   Record<string, string>
  watchedVideoIds: string[]
  onNext: (data: {
    durationDays: 30 | 50 | 66
    pillars:      string[]
    goals:        Record<string, string>
  }) => void
}

const ALL_PILLARS: PillarName[] = ['spiritual', 'physical', 'nutritional', 'personal']

const PILLAR_LABEL: Record<PillarName, string> = {
  spiritual: 'Spiritual', physical: 'Physical',
  nutritional: 'Nutritional', personal: 'Personal',
}
const PILLAR_COLOR: Record<PillarName, string> = {
  spiritual: 'text-purple-400', physical: 'text-emerald-400',
  nutritional: 'text-amber-400', personal: 'text-blue-400',
}
const PILLAR_BORDER: Record<PillarName, string> = {
  spiritual: 'border-purple-500 bg-purple-950/40',
  physical:  'border-emerald-500 bg-emerald-950/40',
  nutritional: 'border-amber-500 bg-amber-950/40',
  personal:  'border-blue-500 bg-blue-950/40',
}
const PILLAR_DESCRIPTION: Record<PillarName, string> = {
  spiritual:   'The foundation of everything else.',
  physical:    'Your body is not separate from your purpose.',
  nutritional: 'What you eat is what you become.',
  personal:    'You are more than your to-do list.',
}
const SUGGESTIONS: Record<PillarName, string[]> = {
  spiritual:   ['Read one chapter of Scripture every day', 'Spend 10 minutes in prayer each morning', 'Write one sentence of gratitude each day'],
  physical:    ['Walk for 20 minutes every day', 'Exercise for 30 minutes daily', 'Get at least 7 hours of sleep each night'],
  nutritional: ['Eat a vegetable with every meal', 'Drink 64 oz of water every day', 'Eat no added sugar after 7:00 PM'],
  personal:    ['Read for 20 minutes every day', 'Write in a journal each morning', 'Spend 15 minutes learning something new'],
}

const DURATION_OPTIONS: { days: 30 | 50 | 66; label: string; description: string }[] = [
  { days: 30, label: '30 Days', description: 'A strong win.' },
  { days: 50, label: '50 Days', description: 'Go deeper.' },
  { days: 66, label: '66 Days', description: 'Make it permanent.' },
]

export default function GroovingStep1Pillars({ durationDays: initDuration, existingPillars, existingGoals, watchedVideoIds, onNext }: Props) {
  const [duration, setDuration]   = useState<30 | 50 | 66>(initDuration)
  const [goals,    setGoals]      = useState<Record<string, string>>(existingGoals)
  const [newPillarAct, setNewPillarAct] = useState<Record<string, boolean>>({})
  const [addedPillars, setAddedPillars] = useState<string[]>([])
  const [watched, setWatched]     = useState<Set<string>>(new Set(watchedVideoIds))
  const [, startTransition]       = useTransition()

  function handleVideoWatched(videoId: string) {
    setWatched(prev => new Set([...prev, videoId]))
    startTransition(async () => {
      await markVideoWatched(videoId, 'grooving_onboarding')
    })
  }

  const g1 = VIDEO_LIBRARY.find(v => v.id === 'G1')

  const availableToAdd = ALL_PILLARS.filter(p => !existingPillars.includes(p) && !addedPillars.includes(p))
  const allSelected    = [...existingPillars, ...addedPillars]

  const canContinue = allSelected.every(p => (goals[p] ?? '').trim().length > 5) &&
    addedPillars.every(p => newPillarAct[p])

  function toggleAdd(pillar: PillarName) {
    if (addedPillars.includes(pillar)) {
      setAddedPillars(prev => prev.filter(p => p !== pillar))
    } else if (addedPillars.length < 2) {
      setAddedPillars(prev => [...prev, pillar])
    }
  }

  return (
    <div className="flex flex-col gap-5 pt-8">

      {/* G1 — Grooving welcome coaching, disappears once watched */}
      {g1 && !watched.has('G1') && (
        <VideoCard video={g1} watched={false} onWatched={handleVideoWatched} />
      )}

      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Level 3 — Grooving</p>
        <h2 className="text-2xl font-black">Set up your challenge</h2>
        <p className="text-slate-400 text-sm">Your Jamming goals carry forward. Adjust anything that needs to change.</p>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Challenge length</p>
        <div className="grid grid-cols-3 gap-2">
          {DURATION_OPTIONS.map(opt => (
            <button
              key={opt.days}
              onClick={() => setDuration(opt.days)}
              className={`rounded-xl border-2 p-3 text-center transition-all ${
                duration === opt.days
                  ? 'border-violet-500 bg-violet-950/50 text-white'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'
              }`}
            >
              <p className="font-black text-sm">{opt.label}</p>
              <p className="text-[10px] mt-0.5 opacity-70">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Proven pillars */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Your proven goals</p>
          <p className="text-xs text-slate-500 mt-0.5">These are yours. You earned them.</p>
        </div>
        {existingPillars.map(p => (
          <div key={p} className={`rounded-2xl border-2 p-4 space-y-3 ${PILLAR_BORDER[p as PillarName]}`}>
            <p className={`text-xs font-black uppercase tracking-widest ${PILLAR_COLOR[p as PillarName]}`}>
              {PILLAR_LABEL[p as PillarName]}
            </p>
            <input
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
              value={goals[p] ?? ''}
              onChange={e => setGoals(prev => ({ ...prev, [p]: e.target.value }))}
              placeholder="Your daily goal"
            />
          </div>
        ))}
      </div>

      {/* Add more pillars */}
      {(availableToAdd.length > 0 || addedPillars.length > 0) && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Add more pillars</p>
            <p className="text-xs text-slate-500 mt-0.5">Optional — you now have full four-pillar access.</p>
          </div>

          {/* Available to add */}
          {availableToAdd.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {availableToAdd.map(p => (
                <button
                  key={p}
                  onClick={() => toggleAdd(p as PillarName)}
                  className="rounded-xl border border-slate-700 bg-slate-900 hover:border-slate-500 p-3 text-left transition-colors"
                >
                  <p className={`text-xs font-black uppercase tracking-widest ${PILLAR_COLOR[p as PillarName]}`}>{PILLAR_LABEL[p as PillarName]}</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">{PILLAR_DESCRIPTION[p as PillarName]}</p>
                  <p className="text-[10px] text-violet-400 mt-1 font-semibold">+ Add</p>
                </button>
              ))}
            </div>
          )}

          {/* Added pillars — goal setup */}
          {addedPillars.map(p => (
            <div key={p} className={`rounded-2xl border-2 p-4 space-y-3 ${PILLAR_BORDER[p as PillarName]}`}>
              <div className="flex items-center justify-between">
                <p className={`text-xs font-black uppercase tracking-widest ${PILLAR_COLOR[p as PillarName]}`}>
                  {PILLAR_LABEL[p as PillarName]} — New
                </p>
                <button
                  onClick={() => {
                    setAddedPillars(prev => prev.filter(x => x !== p))
                    setGoals(prev => { const next = { ...prev }; delete next[p]; return next })
                  }}
                  className="text-slate-500 hover:text-slate-300 text-xs"
                >
                  Remove
                </button>
              </div>

              {/* Suggestions */}
              <div className="flex flex-col gap-1.5">
                {SUGGESTIONS[p as PillarName].map(s => (
                  <button
                    key={s}
                    onClick={() => setGoals(prev => ({ ...prev, [p]: s }))}
                    className={`text-left px-3 py-2 rounded-xl border text-xs transition-all ${
                      goals[p] === s
                        ? `border-slate-500 bg-slate-800 text-white font-semibold`
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <input
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
                placeholder="Or write your own goal"
                value={goals[p] ?? ''}
                onChange={e => setGoals(prev => ({ ...prev, [p]: e.target.value }))}
              />

              <label className="flex items-start gap-3 cursor-pointer bg-slate-900/60 border border-slate-700 rounded-xl p-3">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 accent-violet-500 flex-shrink-0"
                  checked={newPillarAct[p] ?? false}
                  onChange={e => setNewPillarAct(prev => ({ ...prev, [p]: e.target.checked }))}
                />
                <div>
                  <span className="font-bold text-xs"><span className="text-violet-400">A</span> — Attainable</span>
                  <p className="text-slate-400 text-xs mt-0.5">Can I do this on the worst day of the year?</p>
                </div>
              </label>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onNext({ durationDays: duration, pillars: allSelected, goals })}
        disabled={!canContinue}
        className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-black text-lg transition-colors"
      >
        Next →
      </button>

    </div>
  )
}
