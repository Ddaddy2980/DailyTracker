'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  daysCompleted:  number
  consistencyPct: number
  pillars:        string[]
  pillarGoals:    Record<string, string>
}

const SCRIPTURE = {
  verse: 'And let us not grow weary of doing good, for in due season we will reap, if we do not give up.',
  ref:   'Galatians 6:9',
}

const PILLAR_LABEL: Record<string, string> = {
  spiritual: 'Spiritual', physical: 'Physical',
  nutritional: 'Nutritional', personal: 'Personal',
}

export default function TuningComplete({ daysCompleted, consistencyPct, pillars, pillarGoals }: Props) {
  const router = useRouter()
  const [step, setStep]         = useState<1 | 2>(1)
  const [duration, setDuration] = useState<14 | 21>(21)

  function handleStartJamming() {
    router.push(`/jamming/onboarding?duration=${duration}`)
  }

  // ── Step 1: Celebration ──────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm" />

        <div className="relative w-full max-w-sm space-y-4">

          <div className="text-center space-y-2">
            <div className="text-6xl">🎉</div>
            <h1 className="text-3xl font-black text-white">You did it.</h1>
            <p className="text-slate-400 text-sm">You did something most people never do.</p>
          </div>

          {/* Tuning badge */}
          <div className="bg-purple-950 border-2 border-purple-700 rounded-3xl p-6 text-center ring-4 ring-purple-500 ring-offset-4 ring-offset-slate-950">
            <div className="text-5xl mb-3">🏅</div>
            <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">Badge Earned</p>
            <h2 className="text-2xl font-black text-white">Tuning</h2>
            <p className="text-purple-300 text-sm mt-1">Level 1 Complete</p>
          </div>

          {/* Stats */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex gap-4">
            <div className="flex-1 text-center">
              <p className="text-2xl font-black text-white">{daysCompleted}</p>
              <p className="text-xs text-slate-400 mt-1">Days completed</p>
            </div>
            <div className="w-px bg-slate-700" />
            <div className="flex-1 text-center">
              <p className="text-2xl font-black text-white">{consistencyPct}%</p>
              <p className="text-xs text-slate-400 mt-1">Consistency</p>
            </div>
            <div className="w-px bg-slate-700" />
            <div className="flex-1 text-center">
              <p className="text-2xl font-black text-white">{pillars.length}</p>
              <p className="text-xs text-slate-400 mt-1">{pillars.length === 1 ? 'Pillar' : 'Pillars'}</p>
            </div>
          </div>

          {/* Scripture */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">A word for you</p>
            <p className="text-white text-sm leading-relaxed italic mb-3">
              &ldquo;{SCRIPTURE.verse}&rdquo;
            </p>
            <p className="text-slate-400 text-sm font-semibold text-right">— {SCRIPTURE.ref}</p>
          </div>

          {/* Share placeholder */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Shareable card</p>
              <p className="text-[11px] text-slate-600">Coming soon</p>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black text-lg text-white transition-colors"
          >
            What&apos;s next? →
          </button>

        </div>
      </div>
    )
  }

  // ── Step 2: Jamming invitation ───────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm space-y-4">

        <div className="text-center space-y-2">
          <div className="text-5xl">🎸</div>
          <h1 className="text-2xl font-black text-white leading-tight">
            You&apos;ve tuned your instrument.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Now it&apos;s time to play.
          </p>
        </div>

        {/* Carry-forward goals */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Your Tuning goal carries forward
          </p>
          {pillars.map(p => (
            <div key={p} className="flex items-start gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase mt-0.5 w-20 shrink-0">
                {PILLAR_LABEL[p] ?? p}
              </span>
              <span className="text-sm text-white">{pillarGoals[p] ?? '—'}</span>
            </div>
          ))}
          <p className="text-xs text-slate-500 pt-1">A second pillar is added in setup.</p>
        </div>

        {/* Duration choice */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Choose your length</p>
          <div className="grid grid-cols-2 gap-3">
            {([14, 21] as const).map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`py-4 rounded-2xl font-black text-lg transition-all border-2 ${
                  duration === d
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {d} days
                <p className={`text-xs font-medium mt-1 ${duration === d ? 'text-purple-300' : 'text-slate-600'}`}>
                  {d === 14 ? 'Build confidence' : 'Ready to push'}
                </p>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 leading-relaxed px-2">
          Two pillars is harder than one. It&apos;s supposed to feel harder before it feels easier — that&apos;s Jamming.
        </p>

        <button
          onClick={handleStartJamming}
          className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black text-lg text-white transition-colors"
        >
          Start Jamming →
        </button>

        <button
          onClick={() => setStep(1)}
          className="w-full py-2 text-slate-500 text-sm hover:text-slate-400 transition-colors"
        >
          ← Back
        </button>

      </div>
    </div>
  )
}
