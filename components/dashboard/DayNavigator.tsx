'use client'

import { useRouter } from 'next/navigation'
import { getDayNumber, todayStr } from '@/lib/constants'

interface DayNavigatorProps {
  viewingDate: string
  challengeStartDate: string
  challengeDurationDays: number
}

function formatLabel(dateStr: string): string {
  if (dateStr === todayStr()) return 'Today'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

export default function DayNavigator({
  viewingDate,
  challengeStartDate,
  challengeDurationDays,
}: DayNavigatorProps) {
  const router = useRouter()

  const dayNumber = getDayNumber(challengeStartDate, viewingDate)
  const label = formatLabel(viewingDate)

  const prevDate = addDays(viewingDate, -1)
  const nextDate = addDays(viewingDate, 1)

  const challengeEndDate = addDays(challengeStartDate, challengeDurationDays - 1)
  const canGoPrev = viewingDate > challengeStartDate
  const canGoNext = viewingDate < todayStr() && viewingDate < challengeEndDate

  function navigate(date: string) {
    if (date === todayStr()) {
      router.push('/dashboard')
    } else {
      router.push(`/dashboard?date=${date}`)
    }
  }

  return (
    <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm">
      <button
        onClick={() => navigate(prevDate)}
        disabled={!canGoPrev}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous day"
      >
        ‹
      </button>

      <div className="text-center">
        <span className="text-sm font-semibold text-slate-700">
          Day {dayNumber}
        </span>
        <span className="text-slate-400 mx-2">—</span>
        <span className="text-sm text-slate-500">{label}</span>
      </div>

      <button
        onClick={() => navigate(nextDate)}
        disabled={!canGoNext}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next day"
      >
        ›
      </button>
    </div>
  )
}
