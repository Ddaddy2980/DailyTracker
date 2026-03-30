'use client'

import { useTransition } from 'react'
import { acknowledgeTuningCompletion } from '@/app/actions'
import type { TuningOutcome, TuningMessage } from '@/lib/types'

interface Props {
  challengeId:         string
  outcome:             TuningOutcome
  message:             TuningMessage
  tuningDaysCompleted: number
  onDismiss:           () => void
}

// ── Copy by variant ───────────────────────────────────────────────────────────

const VARIANT = {
  full_celebration: {
    icon:      '🎉',
    heading:   'You nailed it.',
    sub:       "Seven days. Consistent. That's not easy — and you did it.",
    badge:     true,
    scripture: {
      verse: 'And let us not grow weary of doing good, for in due season we will reap, if we do not give up.',
      ref:   'Galatians 6:9',
    },
    cta: 'Time to Jam →',
  },
  grace_passage: {
    icon:      '🌱',
    heading:   'You showed up.',
    sub:       "It wasn't perfect. But you came back, and that matters more than you know.",
    badge:     false,
    scripture: {
      verse: 'I can do all things through him who strengthens me.',
      ref:   'Philippians 4:13',
    },
    cta: 'Keep going →',
  },
  pastoral_reset: {
    icon:      '🙏',
    heading:   'This week was hard.',
    sub:       "You're still here. That's the starting line. Your journey continues.",
    badge:     false,
    scripture: {
      verse: 'They who wait for the Lord shall renew their strength; they shall mount up with wings like eagles.',
      ref:   'Isaiah 40:31',
    },
    cta: 'Continue my journey →',
  },
} satisfies Record<TuningMessage, {
  icon: string; heading: string; sub: string; badge: boolean;
  scripture: { verse: string; ref: string }; cta: string
}>

// ── Component ─────────────────────────────────────────────────────────────────

export default function TuningEvaluationModal({
  challengeId, outcome, message, tuningDaysCompleted, onDismiss,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const v = VARIANT[message]

  function handleContinue() {
    startTransition(async () => {
      await acknowledgeTuningCompletion(challengeId)
      onDismiss()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm space-y-4">

        {/* Heading */}
        <div className="text-center space-y-2">
          <div className="text-6xl">{v.icon}</div>
          <h1 className="text-3xl font-black text-white">{v.heading}</h1>
          <p className="text-slate-400 text-sm leading-relaxed">{v.sub}</p>
        </div>

        {/* Badge (full celebration only) */}
        {v.badge && (
          <div className="bg-purple-950 border-2 border-purple-700 rounded-3xl p-6 text-center ring-4 ring-purple-500 ring-offset-4 ring-offset-slate-950">
            <div className="text-5xl mb-3">🏅</div>
            <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">Badge Earned</p>
            <h2 className="text-2xl font-black text-white">Tuning</h2>
            <p className="text-purple-300 text-sm mt-1">Level 1 Complete</p>
          </div>
        )}

        {/* Stats */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex gap-4 text-center">
          <div className="flex-1">
            <p className="text-2xl font-black text-white">{tuningDaysCompleted}</p>
            <p className="text-xs text-slate-400 mt-1">of 7 days</p>
          </div>
          <div className="w-px bg-slate-700" />
          <div className="flex-1">
            <p className="text-2xl font-black text-white">
              {outcome === 'advance' ? '✓' : outcome === 'grace_advance' ? '~' : '↗'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {outcome === 'advance' ? 'Full pass' : outcome === 'grace_advance' ? 'Grace pass' : 'Continuing'}
            </p>
          </div>
          <div className="w-px bg-slate-700" />
          <div className="flex-1">
            <p className="text-2xl font-black text-white">2</p>
            <p className="text-xs text-slate-400 mt-1">Next level</p>
          </div>
        </div>

        {/* Scripture */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">A word for you</p>
          <p className="text-white text-sm leading-relaxed italic mb-3">
            &ldquo;{v.scripture.verse}&rdquo;
          </p>
          <p className="text-slate-400 text-sm font-semibold text-right">— {v.scripture.ref}</p>
        </div>

        {/* What's next */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">What happens next</p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Your journey advances to <span className="text-white font-bold">Level 2 — Jamming</span>.
            Your goals carry forward. Keep your streak alive.
          </p>
        </div>

        <button
          onClick={handleContinue}
          disabled={isPending}
          className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50
            rounded-2xl font-black text-lg text-white transition-colors"
        >
          {isPending ? 'Saving…' : v.cta}
        </button>

      </div>
    </div>
  )
}
