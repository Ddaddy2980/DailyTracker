'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ImmediatePauseCard() {
  const router = useRouter()
  const [pauseReason, setPauseReason] = useState('')
  const [pausing, setPausing]         = useState(false)
  const [pauseError, setPauseError]   = useState<string | null>(null)

  async function handleImmediatePause() {
    setPausing(true)
    setPauseError(null)
    try {
      const res  = await fetch('/api/challenges/pause', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'immediate', reason: pauseReason || undefined }),
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        setPauseError(data.error ?? 'Failed to pause. Please try again.')
        return
      }
      router.refresh()
    } catch {
      setPauseError('Connection error. Please try again.')
    } finally {
      setPausing(false)
    }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-5">
      <p className="text-sm font-semibold text-slate-700 mb-1">Take a Pause Now</p>
      <p className="text-xs text-slate-500 mb-3">
        Life happens. Pause your journey and resume when you&apos;re ready — no progress lost.
      </p>
      <textarea
        value={pauseReason}
        onChange={(e) => setPauseReason(e.target.value)}
        placeholder="Optional: what's going on? (vacation, surgery, family, etc.)"
        maxLength={500}
        rows={2}
        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 mb-3"
      />
      {pauseError && (
        <p className="text-xs text-red-500 mb-2">{pauseError}</p>
      )}
      <button
        type="button"
        onClick={handleImmediatePause}
        disabled={pausing}
        className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-60 hover:bg-amber-600 active:bg-amber-700 transition-colors"
      >
        {pausing ? 'Pausing…' : 'Pause My Journey'}
      </button>
    </div>
  )
}
