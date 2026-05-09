'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ChallengeDuration } from '@/lib/types'
import { CHALLENGE_DURATIONS } from '@/lib/constants'
import Spinner from '@/components/ui/Spinner'

const DURATION_DESCRIPTIONS: Record<ChallengeDuration, string> = {
  21:  'A focused sprint',
  30:  'A full month',
  60:  'A full season',
  90:  'Deep commitment',
  100: 'A century of purpose',
}

export default function DurationPicker() {
  const router = useRouter()
  const [selected, setSelected] = useState<ChallengeDuration | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleBegin() {
    if (!selected || saving) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/onboarding/duration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_days: selected }),
      })

      if (!res.ok) {
        setError('Could not save. Try again.')
        setSaving(false)
        return
      }

      router.push('/onboarding/videos')
    } catch {
      setError('Connection error. Try again.')
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-lg mt-6">
      <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
        Choose Your Challenge Length
      </h1>
      <p className="text-slate-500 text-center mb-8 text-sm">
        How long do you want your first challenge to be? You can always go again after.
      </p>

      <div className="flex flex-col gap-3 mb-8">
        {CHALLENGE_DURATIONS.map((days) => {
          const isSelected = selected === days
          return (
            <button
              key={days}
              onClick={() => setSelected(days)}
              className={[
                'flex items-center gap-4 w-full rounded-xl border-2 px-5 py-4 text-left transition-colors',
                isSelected
                  ? 'border-slate-800 bg-slate-50'
                  : 'border-slate-200 bg-white hover:border-slate-300',
              ].join(' ')}
            >
              <span className={[
                'text-3xl font-bold tabular-nums leading-none',
                isSelected ? 'text-slate-900' : 'text-slate-700',
              ].join(' ')}>
                {days}
              </span>
              <div>
                <p className={[
                  'text-sm font-semibold',
                  isSelected ? 'text-slate-900' : 'text-slate-600',
                ].join(' ')}>
                  days
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {DURATION_DESCRIPTIONS[days]}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {error && (
        <p className="text-red-500 text-xs text-center mb-2">{error}</p>
      )}

      <button
        onClick={handleBegin}
        disabled={!selected || saving}
        className={[
          'w-full py-3 rounded-xl font-semibold text-sm transition-colors',
          selected && !saving
            ? 'bg-slate-900 text-white hover:bg-slate-800'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed',
        ].join(' ')}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner className="h-4 w-4" />
            Saving…
          </span>
        ) : (
          'Begin My Challenge →'
        )}
      </button>
    </div>
  )
}
