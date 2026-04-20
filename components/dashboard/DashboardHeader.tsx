'use client'

import { useRouter } from 'next/navigation'
import { getDayNumber, todayStr } from '@/lib/constants'

interface DashboardHeaderProps {
  username: string | null
  viewingDate: string
  challengeStartDate: string
  challengeDurationDays: number
  completionPct: number
  isPaused?: boolean
  effectiveDay: number
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

function getGreeting(effectiveDay: number, completionPct: number): string {
  if (effectiveDay === 1) return 'Welcome Back!'
  if (completionPct > 0) return "You've Got This!"
  return "Let's Do This!"
}

const RING_SIZE = 44
const RING_STROKE = 4
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export default function DashboardHeader({
  username,
  viewingDate,
  challengeStartDate,
  challengeDurationDays,
  completionPct,
  isPaused = false,
  effectiveDay,
}: DashboardHeaderProps) {
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

  const greeting = isPaused ? 'Your journey is on hold' : getGreeting(effectiveDay, completionPct)
  const ringOffset = RING_CIRCUMFERENCE * (1 - completionPct / 100)

  return (
    <div className="bg-white rounded-xl px-3 py-3 shadow-sm flex items-center gap-2">
      <button
        onClick={() => navigate(prevDate)}
        disabled={!canGoPrev}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        aria-label="Previous day"
      >
        ‹
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-slate-800 leading-tight">
          {username ? `Hi ${username}!` : 'Hi there!'}
        </p>
        <p className="text-xs text-slate-500 leading-tight">{greeting}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          <span className="font-semibold text-slate-700">Day {dayNumber}</span>
          <span className="text-slate-400 mx-1">—</span>
          <span>{label}</span>
        </p>
      </div>

      <div
        className="flex-shrink-0 relative flex items-center justify-center"
        style={{ width: RING_SIZE, height: RING_SIZE }}
      >
        <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={RING_STROKE}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke={isPaused ? '#f59e0b' : '#22c55e'}
            strokeWidth={RING_STROKE}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={isPaused ? 0 : ringOffset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        <span className="absolute text-[9px] font-bold text-slate-700">
          {isPaused ? '—' : `${completionPct}%`}
        </span>
      </div>

      <button
        onClick={() => navigate(nextDate)}
        disabled={!canGoNext}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        aria-label="Next day"
      >
        ›
      </button>
    </div>
  )
}
