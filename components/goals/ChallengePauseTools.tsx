'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ChallengePauseToolsProps {
  isPaused:              boolean
  pauseDaysUsed:         number
  scheduledPauseDate:    string | null
  scheduledPauseReason:  string | null
  maxPauseDays:          number   // 14
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

export default function ChallengePauseTools({
  isPaused,
  pauseDaysUsed,
  scheduledPauseDate,
  scheduledPauseReason,
  maxPauseDays,
}: ChallengePauseToolsProps) {
  const router = useRouter()

  // Immediate pause state
  const [pauseReason, setPauseReason]     = useState('')
  const [pausing, setPausing]             = useState(false)
  const [pauseError, setPauseError]       = useState<string | null>(null)

  // Resume state
  const [resuming, setResuming]           = useState(false)
  const [resumeMsg, setResumeMsg]         = useState<string | null>(null)
  const [resumeError, setResumeError]     = useState<string | null>(null)

  // Scheduled pause state
  const [schedDate, setSchedDate]         = useState(scheduledPauseDate ?? '')
  const [schedReason, setSchedReason]     = useState(scheduledPauseReason ?? '')
  const [scheduling, setScheduling]       = useState(false)
  const [schedMsg, setSchedMsg]           = useState<string | null>(null)
  const [schedError, setSchedError]       = useState<string | null>(null)
  const [cancellingScheduled, setCancellingScheduled] = useState(false)

  const daysRemaining = Math.max(0, maxPauseDays - pauseDaysUsed)

  // ——— Immediate pause ———
  async function handleImmediatePause() {
    setPausing(true)
    setPauseError(null)
    const res  = await fetch('/api/challenges/pause', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: 'immediate', reason: pauseReason || undefined }),
    })
    const data = (await res.json()) as { success?: boolean; error?: string }
    if (!res.ok || !data.success) {
      setPauseError(data.error ?? 'Failed to pause. Please try again.')
      setPausing(false)
      return
    }
    router.refresh()
  }

  // ——— Resume ———
  async function handleResume() {
    setResuming(true)
    setResumeError(null)
    setResumeMsg(null)
    const res  = await fetch('/api/challenges/resume', { method: 'POST' })
    const data = (await res.json()) as { success?: boolean; pausedDays?: number; error?: string }
    if (!res.ok || !data.success) {
      setResumeError(data.error ?? 'Failed to resume. Please try again.')
      setResuming(false)
      return
    }
    setResumeMsg(`Welcome back! You paused for ${data.pausedDays} ${data.pausedDays === 1 ? 'day' : 'days'}.`)
    setTimeout(() => router.refresh(), 1800)
  }

  // ——— Schedule pause ———
  async function handleSchedule() {
    setScheduling(true)
    setSchedError(null)
    setSchedMsg(null)
    if (!schedDate || !ISO_DATE_RE.test(schedDate) || schedDate <= todayStr()) {
      setSchedError('Please pick a future date.')
      setScheduling(false)
      return
    }
    const res  = await fetch('/api/challenges/pause', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: 'scheduled', scheduledDate: schedDate, reason: schedReason || undefined }),
    })
    const data = (await res.json()) as { success?: boolean; error?: string }
    if (!res.ok || !data.success) {
      setSchedError(data.error ?? 'Failed to schedule. Please try again.')
      setScheduling(false)
      return
    }
    setSchedMsg(`Pause scheduled for ${schedDate}.`)
    setScheduling(false)
    router.refresh()
  }

  // ——— Cancel scheduled pause ———
  async function handleCancelScheduled() {
    setCancellingScheduled(true)
    const res  = await fetch('/api/challenges/pause', { method: 'DELETE' })
    const data = (await res.json()) as { success?: boolean }
    if (res.ok && data.success) {
      setSchedDate('')
      setSchedReason('')
      setSchedMsg(null)
    }
    setCancellingScheduled(false)
    router.refresh()
  }

  return (
    <section id="challenge-tools" className="mt-10 mb-6">
      <h2 className="text-base font-semibold text-slate-700 mb-1">Challenge Tools</h2>
      <p className="text-xs text-slate-400 mb-4">
        You have {daysRemaining} of {maxPauseDays} pause days remaining.
      </p>

      {isPaused ? (
        /* ——— Currently paused ——— */
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
      ) : (
        /* ——— Not paused ——— */
        <div className="space-y-4">
          {/* Immediate pause */}
          {daysRemaining > 0 && (
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
          )}

          {/* Scheduled pause */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-5">
            <p className="text-sm font-semibold text-slate-700 mb-1">Schedule a Future Pause</p>
            <p className="text-xs text-slate-500 mb-3">
              Know a vacation or event is coming up? Set a date and your journey will automatically
              pause when that day arrives.
            </p>

            {scheduledPauseDate ? (
              /* Existing scheduled pause */
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-3">
                <p className="text-xs font-semibold text-amber-700">
                  Pause scheduled for {scheduledPauseDate}
                </p>
                {scheduledPauseReason && (
                  <p className="text-xs text-amber-600 italic mt-0.5">{scheduledPauseReason}</p>
                )}
                <button
                  type="button"
                  onClick={handleCancelScheduled}
                  disabled={cancellingScheduled}
                  className="mt-2 text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  {cancellingScheduled ? 'Cancelling…' : 'Cancel scheduled pause'}
                </button>
              </div>
            ) : (
              <>
                <input
                  type="date"
                  value={schedDate}
                  min={todayStr()}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 mb-2"
                />
                <input
                  type="text"
                  value={schedReason}
                  onChange={(e) => setSchedReason(e.target.value)}
                  placeholder="Optional reason (e.g. Family vacation)"
                  maxLength={200}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 mb-3"
                />
                {schedError && (
                  <p className="text-xs text-red-500 mb-2">{schedError}</p>
                )}
                {schedMsg && (
                  <p className="text-xs text-emerald-600 mb-2">{schedMsg}</p>
                )}
                <button
                  type="button"
                  onClick={handleSchedule}
                  disabled={scheduling || !schedDate}
                  className="w-full py-2.5 rounded-xl bg-slate-700 text-white text-sm font-semibold disabled:opacity-40 hover:bg-slate-800 active:bg-slate-900 transition-colors"
                >
                  {scheduling ? 'Scheduling…' : 'Schedule Pause'}
                </button>
              </>
            )}
          </div>

          {daysRemaining === 0 && (
            <p className="text-xs text-slate-400 text-center">
              You&apos;ve used all {maxPauseDays} pause days for this challenge.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
