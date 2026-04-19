'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DurationGoal, PillarDailyEntry } from '@/lib/types'

function todayStr() {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

function getAllPct(date: string, entries: PillarDailyEntry[], goals: DurationGoal[]): number | null {
  const dateEntries = entries.filter((e) => e.entry_date === date)
  if (dateEntries.length === 0) return null
  if (goals.length === 0) return null
  const completed = goals.filter((g) => {
    const entry = dateEntries.find((e) => e.pillar === g.pillar)
    return entry?.goal_completions?.[g.id] === true
  }).length
  return Math.round((completed / goals.length) * 100)
}

interface Props {
  challengeStartDate: string
  allEntries: PillarDailyEntry[]
  activeGoals: DurationGoal[]
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function HistoryMonthGrid({ challengeStartDate, allEntries, activeGoals }: Props) {
  const today = todayStr()
  const todayDate = new Date(today + 'T00:00:00')
  const challengeDate = new Date(challengeStartDate + 'T00:00:00')

  const [year, setYear] = useState(todayDate.getFullYear())
  const [month, setMonth] = useState(todayDate.getMonth()) // 0-indexed
  const router = useRouter()

  const canGoPrev =
    year > challengeDate.getFullYear() ||
    (year === challengeDate.getFullYear() && month > challengeDate.getMonth())
  const canGoNext =
    year < todayDate.getFullYear() ||
    (year === todayDate.getFullYear() && month < todayDate.getMonth())

  function goToPrev() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }
  function goToNext() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function toDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function cellClass(pct: number | null, isValid: boolean, isToday: boolean): string {
    const base = 'flex flex-col items-center justify-center rounded-lg h-12 text-xs transition-colors'
    if (!isValid) return `${base} bg-slate-600 text-slate-300 cursor-default`
    if (isToday && pct === null) return `${base} bg-slate-600 ring-2 ring-white text-white cursor-pointer`
    if (pct === null) return `${base} bg-slate-600 text-slate-400 cursor-pointer`
    if (pct >= 80) return `${base} bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700`
    if (pct >= 40) return `${base} bg-amber-500 text-white cursor-pointer hover:bg-amber-600`
    return `${base} bg-red-600 text-white cursor-pointer hover:bg-red-700`
  }

  function navigateToDay(date: string) {
    if (date === today) router.push('/dashboard')
    else router.push(`/dashboard?date=${date}`)
  }

  return (
    <div className="bg-slate-700 rounded-xl shadow-sm overflow-hidden">
      {/* Month navigation header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600">
        <button
          onClick={goToPrev}
          disabled={!canGoPrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-white">{MONTH_NAMES[month]} {year}</p>
        <button
          onClick={goToNext}
          disabled={!canGoNext}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day-of-week header row */}
      <div className="grid grid-cols-7 gap-1 px-3 pt-3 pb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs text-slate-300">{d}</div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1 px-3 pb-3">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="h-12" />
          const date = toDateStr(day)
          const isFuture = date > today
          const isBeforeChallenge = date < challengeStartDate
          const isValid = !isFuture && !isBeforeChallenge
          const isToday = date === today
          const rawPct = isValid ? getAllPct(date, allEntries, activeGoals) : null
          // Past missed days count as 0% (red); today with no entry stays neutral
          const pct = rawPct !== null ? rawPct : (isValid && !isToday ? 0 : null)

          return (
            <button
              key={i}
              onClick={() => isValid ? navigateToDay(date) : undefined}
              disabled={!isValid}
              className={cellClass(pct, isValid, isToday)}
              aria-label={`${date}: ${pct !== null ? `${pct}%` : isValid ? 'no entry' : ''}`}
            >
              <span className={`font-semibold text-xs ${!isValid ? 'text-slate-300' : ''}`}>{day}</span>
              {isValid && pct !== null && (
                <span className="text-[9px] leading-none mt-0.5">{pct}%</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
