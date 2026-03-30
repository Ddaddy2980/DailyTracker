'use client'

// =============================================================================
// PausedState — Step 27, Part D
//
// Replaces the entire Today tab content while a Grooving challenge is paused.
// Shows: pause label, days-paused counter, subtle 14-day progress indicator,
// the user's purpose statement (or a fallback), and the Resume button.
//
// Does NOT render: goals, check-in, calendar, video cards, pulse check,
// or any feature that implies the challenge is active.
// The Group tab remains accessible via the tab switcher in GroovingDash.
// =============================================================================

import { useTransition } from 'react'
import { resumeChallenge } from '@/app/actions'
import type { ChallengePause } from '@/lib/types'

interface Props {
  challengeId:      string
  purposeStatement: string | null
  pauseRecord:      ChallengePause | null
  onResumed:        () => void
}

// Calculate how many calendar days have elapsed since the pause started.
// Always at least 1; capped at 14 (the auto-resume ceiling).
function calcDaysPaused(pauseRecord: ChallengePause | null): number {
  if (!pauseRecord?.paused_at) return 1
  const msPaused = Date.now() - new Date(pauseRecord.paused_at).getTime()
  return Math.min(Math.max(Math.ceil(msPaused / 86_400_000), 1), 14)
}

export default function PausedState({
  challengeId, purposeStatement, pauseRecord, onResumed,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const daysPaused    = calcDaysPaused(pauseRecord)
  const daysRemaining = 14 - daysPaused
  const progressPct   = Math.round((daysPaused / 14) * 100)

  function handleResume() {
    startTransition(async () => {
      await resumeChallenge(challengeId)
      onResumed()
    })
  }

  return (
    <div className="space-y-10 py-2">

      {/* ── Status label ────────────────────────────────────────────────────── */}
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
        Challenge paused
      </p>

      {/* ── Days paused counter + progress bar ──────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-white font-bold text-3xl tracking-tight">
          Day {daysPaused} of your pause
        </p>

        {/* Subtle 14-day progress indicator — informational, not alarming */}
        <div className="space-y-1.5">
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-700/50 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-slate-600 text-xs">
            {daysRemaining > 0
              ? `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining before auto-resume`
              : 'Auto-resuming today'}
          </p>
        </div>
      </div>

      {/* ── Purpose statement — the reason they started ─────────────────────── */}
      <div className="py-4">
        {purposeStatement ? (
          <p className="font-serif text-white text-xl leading-relaxed text-center">
            &ldquo;{purposeStatement}&rdquo;
          </p>
        ) : (
          <p className="font-serif text-slate-400 text-xl leading-relaxed text-center italic">
            Your challenge is resting. You will be back.
          </p>
        )}
      </div>

      {/* ── Resume action ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <button
          onClick={handleResume}
          disabled={isPending}
          className="w-full py-4 bg-violet-700 hover:bg-violet-600
            disabled:opacity-50 disabled:cursor-not-allowed
            text-white font-bold rounded-2xl transition-colors text-base active:scale-95"
        >
          {isPending ? 'Resuming…' : 'Resume my challenge'}
        </button>
        <p className="text-center text-slate-600 text-xs">
          Your challenge will resume automatically after 14 days.
        </p>
      </div>

    </div>
  )
}
