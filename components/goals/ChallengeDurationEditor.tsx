'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CHALLENGE_DURATIONS } from '@/lib/constants'
import type { ChallengeDuration } from '@/lib/types'

interface ChallengeDurationEditorProps {
  currentDuration: number   // challenge.duration_days (may be non-preset after Add a Week)
  currentDay:      number   // effective day so we can warn on shortening
}

export default function ChallengeDurationEditor({
  currentDuration,
  currentDay,
}: ChallengeDurationEditorProps) {
  const router = useRouter()
  const [isOpen, setIsOpen]             = useState(false)
  const [selected, setSelected]         = useState<number>(currentDuration)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const [showWarnModal, setShowWarnModal] = useState(false)
  const [pendingDuration, setPendingDuration] = useState<number | null>(null)

  // The "Add a Week" value is always current challenge duration + 7
  const addWeekValue = currentDuration + 7

  async function saveChange(durationDays: number) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/challenges/duration', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationDays }),
      })
      const data: { success?: boolean; wouldCompleteNow?: boolean; error?: string } = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSaving(false)
        return
      }
      // If the change would immediately complete the challenge, the dashboard will
      // detect it on the next load and redirect to /completion.
      setIsOpen(false)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setSaving(false)
    }
  }

  function handleSelect(durationDays: number) {
    setSelected(durationDays)
  }

  function handleConfirm() {
    if (selected < currentDay) {
      // Shortening past current day — warn first
      setPendingDuration(selected)
      setShowWarnModal(true)
      return
    }
    saveChange(selected)
  }

  function handleAddWeek() {
    saveChange(addWeekValue)
  }

  return (
    <>
      {/* 3D pill button — closed state */}
      {!isOpen && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-b from-gray-200 to-gray-300 border border-gray-300 shadow-[0_3px_0_0_#9ca3af] active:shadow-[0_1px_0_0_#9ca3af] active:translate-y-0.5 transition-all duration-75 text-slate-700 text-sm font-semibold"
          >
            <span className="text-slate-500 text-xs font-medium">{currentDuration} days</span>
            <span className="text-slate-400">·</span>
            <span>Change Duration?</span>
          </button>
        </div>
      )}

      {/* Expanded editor */}
      {isOpen && (
        <div className="mb-5 bg-white rounded-2xl px-5 py-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-slate-800">Challenge Duration</p>
              <p className="text-xs text-slate-400 mt-0.5">Currently {currentDuration} days · Day {currentDay}</p>
            </div>
            <button
              type="button"
              onClick={() => { setIsOpen(false); setSelected(currentDuration); setError('') }}
              className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>

          {/* Preset grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {CHALLENGE_DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleSelect(d)}
                className={[
                  'py-3 rounded-xl font-semibold text-sm transition-all',
                  selected === d
                    ? 'bg-slate-800 text-white shadow-[0_3px_0_rgba(0,0,0,0.25)]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                {d} days
              </button>
            ))}
          </div>

          {/* Add a Week */}
          <button
            type="button"
            onClick={handleAddWeek}
            disabled={saving}
            className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 text-sm font-semibold hover:border-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {saving ? 'Saving…' : `+ Add a Week  (→ ${addWeekValue} days total)`}
          </button>

          {error && (
            <p className="text-xs text-red-500 text-center mb-3">{error}</p>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || selected === currentDuration}
            className={[
              'w-full py-3.5 rounded-2xl font-semibold text-sm transition-all',
              saving || selected === currentDuration
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-800 text-white shadow-[0_4px_0_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] active:translate-y-0.5',
            ].join(' ')}
          >
            {saving ? 'Saving…' : `Save — ${selected} days`}
          </button>
        </div>
      )}

      {/* Warning modal when shortening past current day */}
      {showWarnModal && pendingDuration !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/40">
          <div className="bg-white rounded-2xl px-6 py-6 shadow-xl max-w-sm w-full">
            <p className="font-bold text-slate-800 text-base mb-2">Heads up</p>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              Setting your challenge to <strong>{pendingDuration} days</strong> is shorter than
              where you are today (Day {currentDay}). This will mark your challenge as complete
              and take you to your completion screen.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowWarnModal(false); setPendingDuration(null) }}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setShowWarnModal(false); saveChange(pendingDuration) }}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-semibold text-sm shadow-[0_3px_0_rgba(0,0,0,0.25)] active:shadow-[0_1px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 transition-all duration-75"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
