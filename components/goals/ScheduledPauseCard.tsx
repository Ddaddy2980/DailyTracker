'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { todayStr } from '@/lib/constants'

interface ScheduledPauseCardProps {
  scheduledPauseDate:   string | null
  scheduledPauseReason: string | null
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default function ScheduledPauseCard({
  scheduledPauseDate,
  scheduledPauseReason,
}: ScheduledPauseCardProps) {
  const router = useRouter()

  const [schedDate, setSchedDate]       = useState(scheduledPauseDate ?? '')
  const [schedReason, setSchedReason]   = useState(scheduledPauseReason ?? '')
  const [scheduling, setScheduling]     = useState(false)
  const [schedMsg, setSchedMsg]         = useState<string | null>(null)
  const [schedError, setSchedError]     = useState<string | null>(null)
  const [cancellingScheduled, setCancellingScheduled] = useState(false)
  const [cancelError, setCancelError]   = useState<string | null>(null)

  async function handleSchedule() {
    setScheduling(true)
    setSchedError(null)
    setSchedMsg(null)
    if (!schedDate || !ISO_DATE_RE.test(schedDate) || schedDate <= todayStr()) {
      setSchedError('Please pick a future date.')
      setScheduling(false)
      return
    }
    try {
      const res  = await fetch('/api/challenges/pause', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'scheduled', scheduledDate: schedDate, reason: schedReason || undefined }),
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        setSchedError(data.error ?? 'Failed to schedule. Please try again.')
        return
      }
      setSchedMsg(`Pause scheduled for ${schedDate}.`)
      router.refresh()
    } catch {
      setSchedError('Connection error. Please try again.')
    } finally {
      setScheduling(false)
    }
  }

  async function handleCancelScheduled() {
    setCancellingScheduled(true)
    setCancelError(null)
    try {
      const res  = await fetch('/api/challenges/pause', { method: 'DELETE' })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        setCancelError(data.error ?? 'Could not cancel. Please try again.')
        return
      }
      setSchedDate('')
      setSchedReason('')
      setSchedMsg(null)
      router.refresh()
    } catch {
      setCancelError('Connection error. Please try again.')
    } finally {
      setCancellingScheduled(false)
    }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-5">
      <p className="text-sm font-semibold text-slate-700 mb-1">Schedule a Future Pause</p>
      <p className="text-xs text-slate-500 mb-3">
        Know a vacation or event is coming up? Set a date and your journey will automatically
        pause when that day arrives.
      </p>

      {scheduledPauseDate ? (
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
          {cancelError && (
            <p className="text-xs text-red-500 mt-2">{cancelError}</p>
          )}
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
  )
}
