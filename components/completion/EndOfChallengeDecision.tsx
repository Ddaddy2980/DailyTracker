'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CHALLENGE_DURATIONS } from '@/lib/constants'

interface EndOfChallengeDecisionProps {
  durationDays: number
  effectiveDay: number
}

type Mode = 'idle' | 'extending'

export default function EndOfChallengeDecision({
  durationDays,
  effectiveDay,
}: EndOfChallengeDecisionProps) {
  const router = useRouter()
  const [mode, setMode]               = useState<Mode>('idle')
  const [selected, setSelected]       = useState<number>(durationDays + 7)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  const minExtension = effectiveDay + 1
  const extensionOptions = CHALLENGE_DURATIONS.filter((d) => d > durationDays)

  async function extendDuration(newDuration: number) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/challenges/duration', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationDays: newDuration }),
      })
      const data: { error?: string } = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSaving(false)
        return
      }
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setSaving(false)
    }
  }

  async function endChallenge() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/challenges/complete', { method: 'POST' })
      const data: { error?: string } = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSaving(false)
        return
      }
      router.push('/completion')
    } catch {
      setError('Network error. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <p className="text-2xl font-bold text-slate-800">
          Your {durationDays}-day challenge is complete.
        </p>
        <p className="text-sm text-slate-500 mt-2">What&rsquo;s next?</p>
      </div>

      {mode === 'idle' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => { setMode('extending'); setSelected(extensionOptions[0] ?? durationDays + 7) }}
            className="w-full px-5 py-4 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-white text-left shadow-[0_4px_0_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 transition-all duration-75"
          >
            <p className="font-bold text-base">Continue the challenge</p>
            <p className="text-xs text-emerald-50 mt-0.5">Add more days and keep going.</p>
          </button>

          <Link
            href="/history"
            className="block w-full px-5 py-4 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-700 text-white text-left shadow-[0_4px_0_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 transition-all duration-75"
          >
            <p className="font-bold text-base">Review previous days</p>
            <p className="text-xs text-blue-50 mt-0.5">Fill in or fix any past day before ending.</p>
          </Link>

          <Link
            href="/goals"
            className="block w-full px-5 py-4 rounded-2xl bg-gradient-to-b from-slate-700 to-slate-800 text-white text-left shadow-[0_4px_0_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 transition-all duration-75"
          >
            <p className="font-bold text-base">Edit my goals</p>
            <p className="text-xs text-slate-300 mt-0.5">Adjust duration or destination goals.</p>
          </Link>

          <button
            type="button"
            onClick={endChallenge}
            disabled={saving}
            className="w-full px-5 py-4 rounded-2xl bg-white border-2 border-slate-300 text-slate-700 text-left hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <p className="font-bold text-base">End and view summary</p>
            <p className="text-xs text-slate-500 mt-0.5">Mark this challenge complete.</p>
          </button>

          {error && (
            <p className="text-xs text-red-500 text-center mt-2">{error}</p>
          )}
        </div>
      )}

      {mode === 'extending' && (
        <div className="bg-white rounded-2xl px-5 py-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-slate-800">Add more days</p>
              <p className="text-xs text-slate-400 mt-0.5">Currently {durationDays} days · Day {effectiveDay}</p>
            </div>
            <button
              type="button"
              onClick={() => { setMode('idle'); setError('') }}
              className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
            >
              Back
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {extensionOptions.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelected(d)}
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

          <button
            type="button"
            onClick={() => extendDuration(durationDays + 7)}
            disabled={saving}
            className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 text-sm font-semibold hover:border-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {saving ? 'Saving…' : `+ Add a Week  (→ ${durationDays + 7} days total)`}
          </button>

          {error && (
            <p className="text-xs text-red-500 text-center mb-3">{error}</p>
          )}

          <button
            type="button"
            onClick={() => extendDuration(selected)}
            disabled={saving || selected < minExtension}
            className={[
              'w-full py-3.5 rounded-2xl font-semibold text-sm transition-all',
              saving || selected < minExtension
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-800 text-white shadow-[0_4px_0_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] active:translate-y-0.5',
            ].join(' ')}
          >
            {saving ? 'Saving…' : `Continue with ${selected} days`}
          </button>
        </div>
      )}
    </div>
  )
}
