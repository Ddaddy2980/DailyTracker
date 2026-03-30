'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveWhatChangedReflection } from '@/app/actions'
import type { PulseCheck as PulseCheckRecord, PulseState } from '@/lib/types'

interface Props {
  daysCompleted:    number
  durationDays:     number
  consistencyPct:   number
  pillars:          string[]
  pillarGoals:      Record<string, string>
  pulseHistory:     PulseCheckRecord[]
  groovingEligible: boolean
}

const PILLAR_LABEL: Record<string, string> = {
  spiritual: 'Spiritual', physical: 'Physical',
  nutritional: 'Nutritional', personal: 'Personal',
}
const PILLAR_COLOR: Record<string, string> = {
  spiritual:   'text-purple-400',
  physical:    'text-emerald-400',
  nutritional: 'text-amber-400',
  personal:    'text-blue-400',
}
const PULSE_LABEL: Record<PulseState, string> = {
  smooth_sailing:  '⛵ Smooth Sailing',
  rough_waters:    '🌊 Rough Waters',
  taking_on_water: '🆘 Taking On Water',
}
const PULSE_COLOR: Record<PulseState, string> = {
  smooth_sailing:  'bg-emerald-950 text-emerald-400 border-emerald-800',
  rough_waters:    'bg-amber-950 text-amber-400 border-amber-800',
  taking_on_water: 'bg-red-950 text-red-400 border-red-800',
}

const SCRIPTURE = {
  verse: 'Not that I have already obtained this or am already perfect, but I press on to make it my own, because Christ Jesus has made me his own.',
  ref:   'Philippians 3:12',
}

const DURATION_OPTIONS = [
  { days: 30, label: '30 Days', description: 'A strong, focused win.' },
  { days: 50, label: '50 Days', description: 'Go deeper.' },
  { days: 66, label: '66 Days', description: 'Make it permanent.' },
] as const

export default function JammingComplete({
  daysCompleted, durationDays, consistencyPct, pillars, pillarGoals, pulseHistory, groovingEligible,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Step 1 = celebration, 2 = "what changed?" (eligible) or "keep jamming" (ineligible), 3 = grooving invite (eligible)
  const [step, setStep]                 = useState<1 | 2 | 3>(1)
  const [copied, setCopied]             = useState(false)
  const [whatChanged, setWhatChanged]   = useState('')
  const [duration, setDuration]         = useState<30 | 50 | 66>(30)

  const shareText = `I just finished my ${durationDays}-day Jamming challenge — ${daysCompleted} days completed, ${pillars.map(p => PILLAR_LABEL[p] ?? p).join(' + ')}, ${consistencyPct}% consistency. Daily Consistency Tracker.`

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ text: shareText }) } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  function handleContinueFromReflection() {
    startTransition(async () => {
      if (whatChanged.trim()) await saveWhatChangedReflection(whatChanged)
      if (groovingEligible) {
        setStep(3)
      } else {
        router.push('/jamming/onboarding')
      }
    })
  }

  // ── Step 1: Celebration ──────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm space-y-4">

          <div className="text-center space-y-2">
            <div className="text-6xl">🎸</div>
            <h1 className="text-3xl font-black text-white">You&apos;ve been Jamming.</h1>
            <p className="text-slate-400 text-sm">
              You didn&apos;t just finish — you built something across{' '}
              {pillars.length > 1 ? 'two pillars' : 'a pillar'} over {durationDays} days. That is real.
            </p>
          </div>

          {/* Badge collection */}
          <div className="flex gap-3">
            <div className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl p-4 text-center">
              <div className="text-3xl mb-1">🎵</div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Level 1</p>
              <p className="text-sm font-bold text-white">Tuning</p>
            </div>
            <div className="flex-1 bg-violet-950 border-2 border-violet-600 rounded-2xl p-4 text-center ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-950">
              <div className="text-3xl mb-1">🎸</div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Level 2</p>
              <p className="text-sm font-bold text-white">Jamming</p>
            </div>
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

          {/* Pillars */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Pillars you built</p>
            {pillars.map(p => (
              <div key={p} className="flex items-start gap-2">
                <span className={`text-xs font-bold uppercase mt-0.5 w-24 shrink-0 ${PILLAR_COLOR[p] ?? 'text-slate-400'}`}>
                  {PILLAR_LABEL[p] ?? p}
                </span>
                <span className="text-sm text-white">{pillarGoals[p] ?? '—'}</span>
              </div>
            ))}
          </div>

          {/* Pulse history */}
          {pulseHistory.length > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Your pulse journey</p>
              <div className="flex flex-wrap gap-2">
                {pulseHistory.map(p => (
                  <span
                    key={p.id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${PULSE_COLOR[p.pulse_state]}`}
                  >
                    {PULSE_LABEL[p.pulse_state]}
                    <span className="text-[10px] opacity-60">W{p.week_number}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scripture */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">A word for you</p>
            <p className="text-white text-sm leading-relaxed italic mb-3">&ldquo;{SCRIPTURE.verse}&rdquo;</p>
            <p className="text-slate-400 text-sm font-semibold text-right">— {SCRIPTURE.ref}</p>
          </div>

          {/* Share */}
          <button
            onClick={handleShare}
            className="w-full bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-2xl p-4 flex items-center gap-3 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              {copied ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300">{copied ? 'Copied to clipboard!' : 'Share your achievement'}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{durationDays} days · {pillars.map(p => PILLAR_LABEL[p] ?? p).join(' + ')} · {consistencyPct}%</p>
            </div>
          </button>

          <button
            onClick={() => setStep(2)}
            className="w-full py-4 bg-violet-600 hover:bg-violet-500 rounded-2xl font-black text-lg text-white transition-colors"
          >
            What&apos;s next? →
          </button>

        </div>
      </div>
    )
  }

  // ── Step 2: "What changed?" reflection ──────────────────────────────────────
  if (step === 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm space-y-5">

          <div className="text-center space-y-2">
            <div className="text-5xl">✍️</div>
            <h1 className="text-2xl font-black text-white leading-tight">Before you go —</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              This is the first time the app has asked you to look backward, not forward.
            </p>
          </div>

          <div className="bg-slate-900 border border-violet-800 rounded-2xl p-5 space-y-3">
            <p className="text-white font-semibold leading-snug">
              In one sentence — what is different about you since you started Tuning?
            </p>
            <textarea
              value={whatChanged}
              onChange={e => setWhatChanged(e.target.value)}
              placeholder="Something has shifted..."
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 resize-none focus:outline-none focus:border-violet-500"
            />
            <p className="text-xs text-slate-500">
              Your answer is saved and shown back to you at key moments ahead.
            </p>
          </div>

          <button
            onClick={handleContinueFromReflection}
            disabled={isPending}
            className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-2xl font-black text-lg text-white transition-colors"
          >
            {isPending ? 'Saving...' : groovingEligible ? 'Continue →' : 'Start Another Jamming →'}
          </button>

          <button onClick={() => setStep(1)} className="w-full py-2 text-slate-500 text-sm hover:text-slate-400 transition-colors">
            ← Back
          </button>

        </div>
      </div>
    )
  }

  // ── Step 3: Grooving invitation (eligible only) ───────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm space-y-4">

        <div className="text-center space-y-2">
          <div className="text-5xl">🎵</div>
          <h1 className="text-2xl font-black text-white leading-tight">You&apos;ve found the rhythm.</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Now it&apos;s time to lock it in.
          </p>
        </div>

        {/* What Grooving is */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Level 3 — Grooving</p>
          <p className="text-sm text-white leading-relaxed">
            Longer challenge. More pillars. A new kind of question — not &ldquo;did you do it?&rdquo; but &ldquo;what is forming in you?&rdquo;
          </p>
          <div className="space-y-1.5 pt-1">
            {['Full four-pillar access', 'Habit calendar', 'Weekly reflection replacing daily tracking', 'Grooving Circle — 5 people who witness your progress'].map(item => (
              <div key={item} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0 mt-1.5" />
                <p className="text-sm text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Duration choice */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Choose your challenge length</p>
          {DURATION_OPTIONS.map(opt => (
            <button
              key={opt.days}
              onClick={() => setDuration(opt.days)}
              className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors text-left ${
                duration === opt.days
                  ? 'bg-violet-950 border-violet-600 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <span className="font-bold">{opt.label}</span>
              <span className="text-sm text-slate-400">{opt.description}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => router.push(`/grooving/onboarding?duration=${duration}`)}
          className="w-full py-4 bg-violet-600 hover:bg-violet-500 rounded-2xl font-black text-lg text-white transition-colors"
        >
          Start Grooving →
        </button>

        <button onClick={() => setStep(2)} className="w-full py-2 text-slate-500 text-sm hover:text-slate-400 transition-colors">
          ← Back
        </button>

      </div>
    </div>
  )
}
