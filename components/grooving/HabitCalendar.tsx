'use client'

import { useState, useTransition } from 'react'
import { markVideoWatched } from '@/app/actions'
import { VIDEO_LIBRARY } from '@/lib/constants'
import VideoCard from '@/components/challenge/VideoCard'
import DayDetailModal from './DayDetailModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

type DayCellStatus = 'complete' | 'partial' | 'missed' | 'future' | 'today'

interface DayCell {
  date:    string
  dayNum:  number
  status:  DayCellStatus
  pillars: Record<string, boolean>
}

function buildCalendar(
  startDate:        string,
  durationDays:     number,
  pillars:          string[],
  pillarDayData:    Record<string, Record<string, boolean>>,
  today:            string,
  todayCompletions: Record<string, boolean>,
): DayCell[] {
  const cells: DayCell[] = []
  for (let i = 0; i < durationDays; i++) {
    const date   = addDays(startDate, i)
    const entry  = pillarDayData[date]
    const isToday = date === today

    let completions: Record<string, boolean>
    let status: DayCellStatus

    if (isToday) {
      completions = todayCompletions
      status = 'today'
    } else if (date > today) {
      completions = Object.fromEntries(pillars.map(p => [p, false]))
      status = 'future'
    } else {
      completions = entry ?? Object.fromEntries(pillars.map(p => [p, false]))
      const doneCount = pillars.filter(p => completions[p]).length
      status = doneCount === pillars.length ? 'complete'
             : doneCount > 0              ? 'partial'
             :                              'missed'
    }

    cells.push({ date, dayNum: i + 1, status, pillars: completions })
  }
  return cells
}

function calcStrongestPillar(
  pillars:      string[],
  pillarDayData: Record<string, Record<string, boolean>>,
  today:        string,
): string | null {
  if (pillars.length === 0) return null
  const counts = Object.fromEntries(pillars.map(p => [p, 0]))
  for (const [date, entry] of Object.entries(pillarDayData)) {
    if (date >= today) continue
    for (const p of pillars) {
      if (entry[p]) counts[p]++
    }
  }
  const sorted = [...pillars].sort((a, b) => counts[b] - counts[a])
  return counts[sorted[0]] > 0 ? sorted[0] : null
}

function calcBestWeekday(
  startDate:    string,
  durationDays: number,
  pillars:      string[],
  pillarDayData: Record<string, Record<string, boolean>>,
  today:        string,
): string | null {
  const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']
  const counts = new Array(7).fill(0)
  const totals = new Array(7).fill(0)
  for (let i = 0; i < durationDays; i++) {
    const date = addDays(startDate, i)
    if (date >= today) break
    const wd    = new Date(date + 'T00:00:00').getDay()
    const entry = pillarDayData[date]
    totals[wd]++
    if (entry && pillars.every(p => entry[p])) counts[wd]++
  }
  let bestWd = -1, bestRate = -1
  for (let wd = 0; wd < 7; wd++) {
    if (totals[wd] < 2) continue
    const rate = counts[wd] / totals[wd]
    if (rate > bestRate) { bestRate = rate; bestWd = wd }
  }
  return bestWd >= 0 && bestRate > 0 ? DAYS[bestWd] : null
}

function findPatternDay(
  startDate:    string,
  dayNumber:    number,
  pillars:      string[],
  pillarDayData: Record<string, Record<string, boolean>>,
  today:        string,
): string | null {
  const completedFullWeeks = Math.floor((dayNumber - 1) / 7)
  if (completedFullWeeks < 3) return null
  const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']
  for (let wd = 0; wd < 7; wd++) {
    let missedCount = 0
    for (let wk = completedFullWeeks - 3; wk < completedFullWeeks; wk++) {
      const weekStart    = addDays(startDate, wk * 7)
      const weekStartDay = new Date(weekStart + 'T00:00:00').getDay()
      const diff         = (wd - weekStartDay + 7) % 7
      const date         = addDays(weekStart, diff)
      if (date < startDate || date >= today) continue
      const entry        = pillarDayData[date]
      const allComplete  = entry && pillars.every(p => entry[p])
      if (!allComplete) missedCount++
    }
    if (missedCount >= 3) return DAYS[wd]
  }
  return null
}

// ── Pillar styles ─────────────────────────────────────────────────────────────

const PILLAR_DOT: Record<string, string> = {
  spiritual:   'bg-[#4a90d9]',
  physical:    'bg-[#6b8dd6]',
  nutritional: 'bg-[#d4863a]',
  personal:    'bg-[#5aab6e]',
}
const PILLAR_LABEL: Record<string, string> = {
  spiritual: 'Spiritual', physical: 'Physical', nutritional: 'Nutritional', personal: 'Personal',
}
const PILLAR_TEXT: Record<string, string> = {
  spiritual:   'text-[#4a90d9]',
  physical:    'text-[#6b8dd6]',
  nutritional: 'text-[#d4863a]',
  personal:    'text-[#5aab6e]',
}

function cellBg(status: DayCellStatus): string {
  switch (status) {
    case 'complete': return 'bg-emerald-50 border-emerald-300'
    case 'partial':  return 'bg-amber-50 border-amber-300'
    case 'missed':   return 'bg-red-50 border-red-200'
    case 'today':    return 'bg-violet-100 border-violet-400 ring-1 ring-violet-400'
    case 'future':   return 'bg-gray-50 border-gray-200'
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  startDate:        string
  durationDays:     number
  pillars:          string[]
  pillarDayData:    Record<string, Record<string, boolean>>
  dayNumber:        number
  today:            string
  todayCompletions: Record<string, boolean>
  watchedVideoIds:  string[]
}

export default function HabitCalendar({
  startDate, durationDays, pillars, pillarDayData,
  dayNumber, today, todayCompletions, watchedVideoIds,
}: Props) {
  const [selected, setSelected] = useState<DayCell | null>(null)
  const [watched, setWatched]   = useState<Set<string>>(new Set(watchedVideoIds))
  const [, startTransition]     = useTransition()

  function handleVideoWatched(videoId: string) {
    setWatched(prev => new Set([...prev, videoId]))
    startTransition(async () => {
      await markVideoWatched(videoId, 'habit_calendar_first_open')
    })
  }

  const g3 = VIDEO_LIBRARY.find(v => v.id === 'G3')

  const cells         = buildCalendar(startDate, durationDays, pillars, pillarDayData, today, todayCompletions)
  const weeks: DayCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  const strongestPillar = calcStrongestPillar(pillars, pillarDayData, today)
  const bestWeekday     = calcBestWeekday(startDate, durationDays, pillars, pillarDayData, today)
  const patternDay      = findPatternDay(startDate, dayNumber, pillars, pillarDayData, today)

  const totalPast     = cells.filter(c => c.status !== 'future' && c.status !== 'today').length
  const totalComplete = cells.filter(c => c.status === 'complete').length
  const consistencyPct = totalPast > 0 ? Math.round((totalComplete / totalPast) * 100) : 0

  function handleCellClick(cell: DayCell) {
    if (cell.status === 'future') return
    setSelected(cell)
  }

  return (
    <div className="space-y-5">

      {g3 && !watched.has('G3') && (
        <VideoCard video={g3} watched={false} onWatched={handleVideoWatched} />
      )}

      {(strongestPillar || bestWeekday) && (
        <div className="grid grid-cols-2 gap-3">
          {strongestPillar && (
            <div className="bg-white border border-[var(--card-border)] rounded-2xl px-4 py-3">
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide font-bold mb-1">Strongest pillar</p>
              <p className={`text-sm font-black ${PILLAR_TEXT[strongestPillar] ?? 'text-[var(--text-primary)]'}`}>
                {PILLAR_LABEL[strongestPillar] ?? strongestPillar}
              </p>
            </div>
          )}
          {bestWeekday && (
            <div className="bg-white border border-[var(--card-border)] rounded-2xl px-4 py-3">
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide font-bold mb-1">Best day</p>
              <p className="text-sm font-black text-[var(--text-primary)]">{bestWeekday}</p>
            </div>
          )}
        </div>
      )}

      {totalPast > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-[var(--text-secondary)]">{totalComplete} complete · {totalPast - totalComplete} missed</p>
          <p className="text-xs font-bold text-[var(--text-primary)]">{consistencyPct}% consistency</p>
        </div>
      )}

      {patternDay && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 flex gap-3 items-start">
          <span className="text-amber-500 text-lg mt-0.5">📊</span>
          <p className="text-amber-700 text-sm leading-relaxed">
            You&apos;ve missed <span className="font-bold">{patternDay}</span> three weeks in a row.
            Want to adjust your goal for that day?
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
        {pillars.map(p => (
          <div key={p} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${PILLAR_DOT[p] ?? 'bg-gray-400'}`} />
            <span className="text-xs text-[var(--text-secondary)]">{PILLAR_LABEL[p] ?? p}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {weeks.map((week, wi) => (
          <div key={wi}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5 pl-0.5">
              Week {wi + 1}
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {week.map(cell => (
                <button
                  key={cell.date}
                  onClick={() => handleCellClick(cell)}
                  disabled={cell.status === 'future'}
                  className={`
                    relative flex flex-col items-center justify-between
                    rounded-xl border px-1 pt-2 pb-1.5 h-14
                    transition-opacity
                    ${cellBg(cell.status)}
                    ${cell.status === 'future' ? 'opacity-30 cursor-default' : 'cursor-pointer active:opacity-80'}
                  `}
                >
                  <span className={`text-[11px] font-bold leading-none
                    ${cell.status === 'complete' ? 'text-emerald-700' :
                      cell.status === 'partial'  ? 'text-amber-700'   :
                      cell.status === 'today'    ? 'text-violet-700'  :
                      cell.status === 'missed'   ? 'text-red-500'     :
                                                   'text-[var(--text-muted)]'}
                  `}>
                    {cell.dayNum}
                  </span>

                  {cell.status !== 'future' && (
                    <div className="flex gap-0.5">
                      {pillars.map(p => (
                        <div
                          key={p}
                          className={`w-1.5 h-1.5 rounded-full ${
                            cell.pillars[p]
                              ? PILLAR_DOT[p] ?? 'bg-gray-400'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <DayDetailModal
          date={selected.date}
          dayNumber={selected.dayNum}
          pillars={pillars}
          completions={selected.pillars}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
