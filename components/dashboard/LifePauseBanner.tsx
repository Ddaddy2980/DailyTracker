'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Shown when pulse_state === 'taking_on_water' and the challenge is NOT currently paused.
// Surfaces an empathetic check-in and a shortcut to the Goals page for pause scheduling.

export default function LifePauseBanner() {
  const router  = useRouter()
  const [dismissing, setDismissing] = useState(false)
  const [pausing, setPausing]       = useState(false)
  const [dismissed, setDismissed]   = useState(false)
  const [error, setError]           = useState<string | null>(null)

  if (dismissed) return null

  async function handleImmediatePause() {
    setPausing(true)
    setError(null)
    try {
      const res  = await fetch('/api/challenges/pause', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'immediate' }),
      })
      const data = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Something went wrong.')
        setPausing(false)
        return
      }
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setPausing(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-amber-200 bg-amber-50">
      <div className="px-4 pt-4 pb-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">🌊</span>
            <p className="text-sm font-semibold text-amber-800">Looks like it&apos;s been a rough stretch</p>
          </div>
          <button
            type="button"
            onClick={() => { setDismissing(true); setDismissed(true) }}
            disabled={dismissing}
            className="text-amber-400 hover:text-amber-600 shrink-0 mt-0.5"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        <p className="text-xs text-amber-700 leading-relaxed mb-3">
          Missing days is part of the journey — not the end of it. If life is getting in the way,
          you can take a breather. You have up to 14 pause days to use without losing your progress.
        </p>

        {error && (
          <p className="text-xs text-red-600 mb-2">{error}</p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleImmediatePause}
            disabled={pausing}
            className="w-full py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60 transition-colors"
          >
            {pausing ? 'Pausing…' : 'Take a Pause Now'}
          </button>

          <Link
            href="/goals#challenge-tools"
            className="block w-full py-2 rounded-xl bg-white border border-amber-200 text-amber-700 text-xs font-semibold text-center hover:bg-amber-50 transition-colors"
          >
            Schedule a Future Pause →
          </Link>
        </div>
      </div>
    </div>
  )
}
