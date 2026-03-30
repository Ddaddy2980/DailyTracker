'use client'

import { useTransition } from 'react'
import { acknowledgeJammingPhase2 } from '@/app/actions'

interface Props {
  challengeId: string
  unlocked:    boolean   // true = jammingDaysCount >= 5 at Day 14
  onDismiss:   () => void
}

export default function JammingPhase2Modal({ challengeId, unlocked, onDismiss }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleContinue() {
    startTransition(async () => {
      await acknowledgeJammingPhase2(challengeId)
      onDismiss()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm space-y-4">

        {unlocked ? (
          <>
            {/* ── Consistent: Phase 2 unlocked ──────────────────────────────── */}
            <div className="text-center space-y-2">
              <div className="text-6xl">🔓</div>
              <h1 className="text-3xl font-black text-white">Phase 2 unlocked.</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                You showed up 5 of the last 7 days. That&apos;s consistency — and consistency compounds.
              </p>
            </div>

            <div className="bg-purple-950 border-2 border-purple-700 rounded-2xl p-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-purple-400">
                Jamming — Phase 2
              </p>
              <p className="text-sm text-white leading-relaxed">
                Days 15–21 are yours to deepen. Your habits are forming — keep building on what&apos;s working.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">A word for you</p>
              <p className="text-white text-sm leading-relaxed italic mb-3">
                &ldquo;As iron sharpens iron, so one person sharpens another.&rdquo;
              </p>
              <p className="text-slate-400 text-sm font-semibold text-right">— Proverbs 27:17</p>
            </div>

            <button
              onClick={handleContinue}
              disabled={isPending}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50
                rounded-2xl font-black text-lg text-white transition-colors"
            >
              {isPending ? 'Saving…' : "Let's go →"}
            </button>
          </>
        ) : (
          <>
            {/* ── Not yet: below threshold ──────────────────────────────────── */}
            <div className="text-center space-y-2">
              <div className="text-6xl">💪</div>
              <h1 className="text-2xl font-black text-white leading-tight">Keep building.</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                You&apos;re in the thick of it. Consistency takes time to feel natural — stay in it through Day 21.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">A word for you</p>
              <p className="text-white text-sm leading-relaxed italic mb-3">
                &ldquo;Let steadfastness have its full effect, that you may be perfect and complete, lacking in nothing.&rdquo;
              </p>
              <p className="text-slate-400 text-sm font-semibold text-right">— James 1:4</p>
            </div>

            <button
              onClick={handleContinue}
              disabled={isPending}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50
                rounded-2xl font-black text-lg text-white transition-colors"
            >
              {isPending ? 'Saving…' : 'Keep going →'}
            </button>
          </>
        )}

      </div>
    </div>
  )
}
