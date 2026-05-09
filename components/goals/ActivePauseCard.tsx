'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ActivePauseCard() {
  const router = useRouter()
  const [resuming, setResuming]       = useState(false)
  const [resumeMsg, setResumeMsg]     = useState<string | null>(null)
  const [resumeError, setResumeError] = useState<string | null>(null)

  async function handleResume() {
    setResuming(true)
    setResumeError(null)
    setResumeMsg(null)
    try {
      const res  = await fetch('/api/challenges/resume', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; pausedDays?: number; error?: string }
      if (!res.ok || !data.success) {
        setResumeError(data.error ?? 'Failed to resume. Please try again.')
        return
      }
      setResumeMsg(`Welcome back! You paused for ${data.pausedDays} ${data.pausedDays === 1 ? 'day' : 'days'}.`)
      setTimeout(() => router.refresh(), 1800)
    } catch {
      setResumeError('Connection error. Please try again.')
    } finally {
      setResuming(false)
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-5">
      <p className="text-sm font-semibold text-amber-800 mb-1">Your journey is currently paused.</p>
      <p className="text-xs text-amber-600 mb-4">
        Ready to get back to it? Hit Resume and pick up right where you left off.
      </p>
      {resumeMsg && (
        <p className="text-sm text-emerald-600 font-medium mb-3">{resumeMsg}</p>
      )}
      {resumeError && (
        <p className="text-xs text-red-500 mb-2">{resumeError}</p>
      )}
      <button
        type="button"
        onClick={handleResume}
        disabled={resuming}
        className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-60 hover:bg-emerald-600 active:bg-emerald-700 transition-colors"
      >
        {resuming ? 'Resuming…' : 'Resume My Journey'}
      </button>
    </div>
  )
}
