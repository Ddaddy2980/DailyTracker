'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeSoloingOnboarding } from '@/app/actions'
import type { PillarLevel } from '@/lib/types'

type DurationDays = 90 | 100

interface Props {
  allPillars:    string[]
  existingGoals: Record<string, string>
  pillarLevels:  PillarLevel[]
}

const PILLAR_LABEL: Record<string, string> = {
  spiritual:   'Spiritual',
  physical:    'Physical',
  nutritional: 'Nutritional',
  personal:    'Personal',
  missional:   'Missional',
}

export default function SoloingOnboardingFlow({ allPillars, existingGoals, pillarLevels }: Props) {
  void pillarLevels

  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [screen, setScreen]           = useState<1 | 2 | 3>(1)
  const [durationDays, setDurationDays] = useState<DurationDays>(90)

  function handleBegin() {
    startTransition(async () => {
      await completeSoloingOnboarding({
        durationDays,
        pillarGoals: existingGoals,
        allPillars,
      })
      router.push('/soloing')
    })
  }

  function ProgressDots() {
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {([1, 2, 3] as const).map(d => (
          <div key={d} className={`rounded-full transition-all ${
            d === screen ? 'w-4 h-2 bg-violet-600'
            : d < screen ? 'w-2 h-2 bg-violet-400'
            : 'w-2 h-2 bg-gray-300'
          }`} />
        ))}
      </div>
    )
  }

  if (screen === 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
           style={{ backgroundColor: 'var(--app-bg)' }}>
        <div className="w-full max-w-sm space-y-6 text-center">
          <ProgressDots />
          <div className="text-5xl">🎻</div>
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Level 4 — Soloing</p>
            <h1 className="text-2xl font-black text-[var(--text-primary)] leading-snug">
              You&apos;re not building this habit anymore.<br />You&apos;re living it.
            </h1>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              Soloing is where the scaffolding comes off. No pulse check. No coaching prompts.
              Just you, your pillars, and the discipline you&apos;ve already proven you have.
            </p>
          </div>
          <button onClick={() => setScreen(2)}
            className="w-full py-3 rounded-2xl font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
            Continue →
          </button>
        </div>
      </div>
    )
  }

  if (screen === 2) {
    const features = [
      { icon: '🎯', title: 'Up to 4 duration goals per pillar', body: 'Layer complexity into each pillar — not just one goal, but a full stack.' },
      { icon: '🏔️', title: 'Unlimited destination goals', body: 'Keep pointing toward something bigger. No cap.' },
      { icon: '📅', title: '90 or 100-day challenge', body: "A longer runway gives habits more time to become something you don't question." },
    ]
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
           style={{ backgroundColor: 'var(--app-bg)' }}>
        <div className="w-full max-w-sm space-y-6">
          <ProgressDots />
          <div className="text-center space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-600">What Soloing looks like</p>
            <h2 className="text-xl font-black text-[var(--text-primary)]">Same daily rhythm. More depth.</h2>
          </div>
          <div className="space-y-3">
            {features.map(f => (
              <div key={f.title} className="flex gap-4 bg-white border border-[var(--card-border)] rounded-2xl p-4">
                <span className="text-2xl shrink-0">{f.icon}</span>
                <div>
                  <p className="text-[var(--text-primary)] text-sm font-bold">{f.title}</p>
                  <p className="text-[var(--text-secondary)] text-xs mt-0.5 leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setScreen(3)}
            className="w-full py-3 rounded-2xl font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
            Continue →
          </button>
        </div>
      </div>
    )
  }

  const options = [
    { days: 90  as DurationDays, label: '90 Days',  sub: 'Three months of Soloing.' },
    { days: 100 as DurationDays, label: '100 Days', sub: 'The full commitment.' },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
         style={{ backgroundColor: 'var(--app-bg)' }}>
      <div className="w-full max-w-sm space-y-6">
        <ProgressDots />
        <div className="text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Choose your runway</p>
          <h2 className="text-xl font-black text-[var(--text-primary)]">How long do you want to Solo?</h2>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {allPillars.map(p => (
            <span key={p} className="text-xs font-bold uppercase tracking-wide text-violet-500">
              {PILLAR_LABEL[p] ?? p}
            </span>
          ))}
        </div>
        <div className="space-y-3">
          {options.map(opt => (
            <button key={opt.days} onClick={() => setDurationDays(opt.days)}
              className={`w-full flex items-center justify-between rounded-2xl border-2 px-5 py-4 transition-all text-left ${
                durationDays === opt.days
                  ? 'border-violet-600 bg-violet-50'
                  : 'border-[var(--card-border)] bg-white hover:border-gray-400'
              }`}>
              <div>
                <p className={`font-black ${durationDays === opt.days ? 'text-violet-700' : 'text-[var(--text-primary)]'}`}>
                  {opt.label}
                </p>
                <p className="text-[var(--text-secondary)] text-xs mt-0.5">{opt.sub}</p>
              </div>
              {durationDays === opt.days && <span className="text-violet-600 font-bold text-lg">✓</span>}
            </button>
          ))}
        </div>
        <button onClick={handleBegin} disabled={isPending}
          className="w-full py-3 rounded-2xl font-bold text-white bg-violet-600 hover:bg-violet-700
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {isPending ? 'Starting…' : 'Begin →'}
        </button>
      </div>
    </div>
  )
}
