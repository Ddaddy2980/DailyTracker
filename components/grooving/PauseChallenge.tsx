'use client'

// =============================================================================
// PauseChallenge — Step 27
//
// Two-screen modal accessed from the settings area at the bottom of the
// Grooving Today tab.  Only shown when pause_used = false.
//
// Screen 1 — reason selection (Travel / Illness / Family / Work / Other)
// Screen 2 — confirmation with day number, streak, and projected end date
// =============================================================================

import { useState, useTransition } from 'react'
import { pauseChallenge, markVideoWatched, type PauseReason } from '@/app/actions'
import { VIDEO_LIBRARY } from '@/lib/constants'
import VideoCard from '@/components/challenge/VideoCard'

interface Props {
  challengeId:     string
  dayNumber:       number
  streak:          number
  endDate:         string    // current challenge end_date — ISO date e.g. '2026-05-10'
  watchedVideoIds: string[]
  onPaused:        () => void
  onClose:         () => void
}

const REASONS: { value: PauseReason; label: string; emoji: string }[] = [
  { value: 'travel',  label: 'Travel',  emoji: '✈️'  },
  { value: 'illness', label: 'Illness', emoji: '🤒'  },
  { value: 'family',  label: 'Family',  emoji: '🏠'  },
  { value: 'work',    label: 'Work',    emoji: '💼'  },
  { value: 'other',   label: 'Other',   emoji: '⏸️'  },
]

// Worst-case end date = current end_date + 14 days.
// The real extension will match actual pause length — this is shown as an estimate only.
function worstCaseEndDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 14)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function PauseChallenge({
  challengeId, dayNumber, streak, endDate, watchedVideoIds, onPaused, onClose,
}: Props) {
  const [screen, setScreen]                 = useState<'reason' | 'confirm'>('reason')
  const [selectedReason, setSelectedReason] = useState<PauseReason | null>(null)
  const [error, setError]                   = useState<string | null>(null)
  const [isPending, startTransition]        = useTransition()
  const [watched, setWatched]               = useState<Set<string>>(new Set(watchedVideoIds))
  const [, startVideoTransition]            = useTransition()

  function handleVideoWatched(videoId: string) {
    setWatched(prev => new Set([...prev, videoId]))
    startVideoTransition(async () => {
      await markVideoWatched(videoId, 'pause_activation')
    })
  }

  const g7 = VIDEO_LIBRARY.find(v => v.id === 'G7')

  function handleContinue() {
    if (!selectedReason) return
    setError(null)
    setScreen('confirm')
  }

  function handlePause() {
    if (!selectedReason) return
    setError(null)
    startTransition(async () => {
      try {
        await pauseChallenge(challengeId, selectedReason)
        onPaused()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-5">

        {/* ── Screen 1 — reason selection ───────────────────────────────────────── */}
        {screen === 'reason' && (
          <>
            {/* G7 — pause coaching, disappears once watched */}
            {g7 && !watched.has('G7') && (
              <VideoCard video={g7} watched={false} onWatched={handleVideoWatched} />
            )}

            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Pause challenge
              </p>
              <p className="text-white font-bold text-lg">What&apos;s coming up?</p>
              <p className="text-slate-400 text-sm leading-relaxed">
                Life happens. Pausing preserves your streak and extends your end date.
                You have one pause available per challenge.
              </p>
            </div>

            {/* Reason buttons — 2-column grid, Other spans full width */}
            <div className="grid grid-cols-2 gap-2">
              {REASONS.filter(r => r.value !== 'other').map(r => (
                <button
                  key={r.value}
                  onClick={() => setSelectedReason(r.value)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold
                    border transition-colors text-left
                    ${selectedReason === r.value
                      ? 'bg-amber-700/30 border-amber-500 text-amber-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-200'
                    }`}
                >
                  <span>{r.emoji}</span>
                  <span>{r.label}</span>
                </button>
              ))}
              {/* Other — full width */}
              <button
                onClick={() => setSelectedReason('other')}
                className={`col-span-2 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold
                  border transition-colors text-left
                  ${selectedReason === 'other'
                    ? 'bg-amber-700/30 border-amber-500 text-amber-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-200'
                  }`}
              >
                <span>⏸️</span>
                <span>Other</span>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold
                  rounded-2xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={!selectedReason}
                className="flex-1 py-3 bg-amber-700 hover:bg-amber-600 disabled:opacity-40
                  disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-colors text-sm"
              >
                Continue →
              </button>
            </div>
          </>
        )}

        {/* ── Screen 2 — confirmation ───────────────────────────────────────────── */}
        {screen === 'confirm' && selectedReason && (
          <>
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Confirm pause
              </p>
              <p className="text-white font-bold text-lg">Pause my challenge</p>
            </div>

            {/* Summary card */}
            <div className="bg-slate-800 rounded-2xl p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Reason</span>
                <span className="text-white font-semibold capitalize">{selectedReason}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current day</span>
                <span className="text-white font-semibold">Day {dayNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current streak</span>
                <span className="text-white font-semibold">
                  {streak} {streak === 1 ? 'day' : 'days'}
                </span>
              </div>
              <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
                <span className="text-slate-400">New finish date</span>
                <span className="text-amber-300 font-semibold">{worstCaseEndDate(endDate)}</span>
              </div>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed">
              The finish date shown is a worst-case estimate (14 days).
              Your challenge will extend by exactly as many days as you pause.
            </p>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setScreen('reason')}
                disabled={isPending}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40
                  text-slate-300 font-semibold rounded-2xl transition-colors text-sm"
              >
                Back
              </button>
              <button
                onClick={handlePause}
                disabled={isPending}
                className="flex-1 py-3 bg-amber-700 hover:bg-amber-600 disabled:opacity-40
                  disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-colors text-sm"
              >
                {isPending ? 'Pausing…' : 'Pause my challenge'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
