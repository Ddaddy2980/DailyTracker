'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PausedDashboardProps {
  pausedAt:      string        // ISO timestamp
  pauseReason:   string | null
  pauseDaysUsed: number        // historical days from past pauses (not including current)
  maxPauseDays:  number        // 14
}

function daysBetween(isoTimestamp: string): number {
  const start = new Date(isoTimestamp)
  const now   = new Date()
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000))
}

export default function PausedDashboard({
  pausedAt,
  pauseReason,
  pauseDaysUsed,
  maxPauseDays,
}: PausedDashboardProps) {
  const router = useRouter()
  const [resuming, setResuming] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const currentPauseDays = daysBetween(pausedAt)
  const totalPauseDays   = pauseDaysUsed + currentPauseDays
  const remaining        = Math.max(0, maxPauseDays - totalPauseDays)

  async function handleResume() {
    setResuming(true)
    setError(null)
    try {
      const res  = await fetch('/api/challenges/resume', { method: 'POST' })
      const data = (await res.json()) as { success?: boolean; pausedDays?: number; error?: string }
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setResuming(false)
        return
      }
      // Reload so the server re-renders with the resumed challenge
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setResuming(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-12 text-center">
      {/* Pause icon */}
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-2">Journey Paused</h2>
      <p className="text-sm text-slate-500 mb-1">
        You&apos;ve been paused for{' '}
        <span className="font-semibold text-slate-700">{currentPauseDays} {currentPauseDays === 1 ? 'day' : 'days'}</span>.
      </p>
      {pauseReason && (
        <p className="text-sm text-slate-400 italic mb-1">&ldquo;{pauseReason}&rdquo;</p>
      )}
      <p className="text-xs text-slate-400 mb-8">
        {remaining > 0
          ? `${remaining} pause ${remaining === 1 ? 'day' : 'days'} remaining of your ${maxPauseDays}-day allowance.`
          : `You have reached your ${maxPauseDays}-day pause limit.`}
      </p>

      {/* Encouragement copy */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-5 mb-8 max-w-sm w-full text-left">
        <p className="text-sm font-semibold text-slate-700 mb-1">Life happens.</p>
        <p className="text-sm text-slate-500 leading-relaxed">
          Your progress is safe. When you&apos;re ready to pick back up, your journey
          will continue right where you left off — no penalty, no judgment.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-500 mb-3">{error}</p>
      )}

      <button
        type="button"
        onClick={handleResume}
        disabled={resuming}
        className="w-full max-w-sm py-3 px-6 rounded-xl bg-emerald-500 text-white font-semibold text-sm shadow-sm hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-60 transition-colors"
      >
        {resuming ? 'Resuming…' : 'Resume My Journey'}
      </button>
    </div>
  )
}
