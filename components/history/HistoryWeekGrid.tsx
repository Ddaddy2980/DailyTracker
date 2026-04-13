'use client'

import { useRouter } from 'next/navigation'
import { getWeekStart } from '@/lib/constants'
import type { PillarLevel, DurationGoal, PillarDailyEntry, PillarName } from '@/lib/types'

interface HistoryWeekGridProps {
  weekStart: string          // Sunday YYYY-MM-DD anchor for this view
  challengeStartDate: string
  allEntries: PillarDailyEntry[]
  activePillarLevels: PillarLevel[]
  activeGoals: DurationGoal[]
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

function formatWeekRange(weekStart: string): string {
  const end = addDays(weekStart, 6)
  const s = new Date(weekStart + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
  })
}

function getPillarPct(
  pillar: PillarName,
  date: string,
  entries: PillarDailyEntry[],
  goals: DurationGoal[],
): number | null {
  const entry = entries.find((e) => e.pillar === pillar && e.entry_date === date)
  if (!entry) return null
  const pillarGoals = goals.filter((g) => g.pillar === pillar)
  if (pillarGoals.length === 0) return null
  const completedCount = pillarGoals.filter((g) => entry.goal_completions?.[g.id] === true).length
  return Math.round((completedCount / pillarGoals.length) * 100)
}

function getAllPct(
  date: string,
  entries: PillarDailyEntry[],
  activePillars: PillarLevel[],
  goals: DurationGoal[],
): number | null {
  const pillarPcts = activePillars
    .map((p) => getPillarPct(p.pillar as PillarName, date, entries, goals))
    .filter((pct): pct is number => pct !== null)
  if (pillarPcts.length === 0) return null
  return Math.round(pillarPcts.reduce((a, b) => a + b, 0) / pillarPcts.length)
}

function cellStyle(pct: number | null, isFuture: boolean, isBeforeChallenge: boolean): string {
  const base = 'w-full h-10 rounded flex items-center justify-center text-xs font-medium transition-colors'
  if (isBeforeChallenge || isFuture) return `${base} bg-slate-100 text-slate-300 cursor-default`
  if (pct === null) return `${base} bg-slate-100 text-slate-400`
  if (pct >= 80) return `${base} bg-emerald-100 text-emerald-700 cursor-pointer hover:bg-emerald-200`
  if (pct >= 40) return `${base} bg-amber-100 text-amber-700 cursor-pointer hover:bg-amber-200`
  return `${base} bg-red-100 text-red-600 cursor-pointer hover:bg-red-200`
}

export default function HistoryWeekGrid({
  weekStart,
  challengeStartDate,
  allEntries,
  activePillarLevels,
  activeGoals,
}: HistoryWeekGridProps) {
  const router = useRouter()
  const today = todayStr()

  // Build the 7 dates for this week
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const prevWeekStart = addDays(weekStart, -7)
  const nextWeekStart = addDays(weekStart, 7)
  const canGoPrev = prevWeekStart >= getWeekStart(challengeStartDate) || weekStart > getWeekStart(challengeStartDate)
  const canGoNext = nextWeekStart <= getWeekStart(today)

  function navigate(newWeekStart: string) {
    if (newWeekStart === getWeekStart(today)) {
      router.push('/history')
    } else {
      router.push(`/history?week=${newWeekStart}`)
    }
  }

  function navigateToDay(date: string) {
    if (date > today) return
    if (date < challengeStartDate) return
    if (date === today) {
      router.push('/dashboard')
    } else {
      router.push(`/dashboard?date=${date}`)
    }
  }

  // Week summary stats
  const loggedDays = weekDates.filter((date) => {
    if (date > today || date < challengeStartDate) return false
    return activePillarLevels.some((p) =>
      allEntries.some((e) => e.pillar === p.pillar && e.entry_date === date)
    )
  }).length

  const weekPcts = weekDates
    .filter((date) => date <= today && date >= challengeStartDate)
    .map((date) => getAllPct(date, allEntries, activePillarLevels, activeGoals))
    .filter((pct): pct is number => pct !== null)
  const avgPct = weekPcts.length === 0 ? null : Math.round(weekPcts.reduce((a, b) => a + b, 0) / weekPcts.length)

  const activePillars = activePillarLevels.map((p) => p.pillar as PillarName)

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Week navigation header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button
          onClick={() => navigate(prevWeekStart)}
          disabled={!canGoPrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous week"
        >
          ‹
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">{formatWeekRange(weekStart)}</p>
          {avgPct !== null && (
            <p className="text-xs text-slate-400">{loggedDays} days logged · avg {avgPct}%</p>
          )}
        </div>

        <button
          onClick={() => navigate(nextWeekStart)}
          disabled={!canGoNext}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next week"
        >
          ›
        </button>
      </div>

      {/* Day header row */}
      <div className="grid grid-cols-8 gap-1 px-3 pt-3 pb-1">
        {/* Pillar label column spacer */}
        <div />
        {weekDates.map((date, i) => (
          <div key={date} className="text-center">
            <p className="text-xs text-slate-400">{DAYS_OF_WEEK[i]}</p>
            <p className={`text-xs font-medium ${date === today ? 'text-emerald-600' : 'text-slate-500'}`}>
              {formatShortDate(date)}
            </p>
          </div>
        ))}
      </div>

      {/* Pillar rows */}
      <div className="px-3 pb-3 space-y-1">
        {activePillars.map((pillar) => (
          <div key={pillar} className="grid grid-cols-8 gap-1 items-center">
            <p className="text-xs text-slate-500 capitalize truncate pr-1">{pillar}</p>
            {weekDates.map((date) => {
              const isFuture = date > today
              const isBeforeChallenge = date < challengeStartDate
              const pct = (!isFuture && !isBeforeChallenge)
                ? getPillarPct(pillar, date, allEntries, activeGoals)
                : null
              return (
                <button
                  key={date}
                  onClick={() => navigateToDay(date)}
                  disabled={isFuture || isBeforeChallenge}
                  className={cellStyle(pct, isFuture, isBeforeChallenge)}
                  aria-label={`${pillar} on ${date}: ${pct !== null ? `${pct}%` : 'no entry'}`}
                >
                  {pct !== null ? `${pct}%` : ''}
                </button>
              )
            })}
          </div>
        ))}

        {/* ALL row */}
        {activePillars.length > 1 && (
          <div className="grid grid-cols-8 gap-1 items-center border-t border-slate-100 pt-1 mt-1">
            <p className="text-xs font-semibold text-slate-600">ALL</p>
            {weekDates.map((date) => {
              const isFuture = date > today
              const isBeforeChallenge = date < challengeStartDate
              const pct = (!isFuture && !isBeforeChallenge)
                ? getAllPct(date, allEntries, activePillarLevels, activeGoals)
                : null
              return (
                <button
                  key={date}
                  onClick={() => navigateToDay(date)}
                  disabled={isFuture || isBeforeChallenge}
                  className={cellStyle(pct, isFuture, isBeforeChallenge)}
                  aria-label={`All pillars on ${date}: ${pct !== null ? `${pct}%` : 'no entry'}`}
                >
                  {pct !== null ? `${pct}%` : ''}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
