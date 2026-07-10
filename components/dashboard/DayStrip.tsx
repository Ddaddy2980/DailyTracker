'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getDayNumber, addDays } from '@/lib/constants'

// Slim day strip below the hero. Collapsed: "Day X of Y · Today ▾". Tapping it
// expands to ‹ › day navigation (URL-based, same as v3) plus a History link.

interface DayStripProps {
  viewingDate:           string
  today:                 string
  challengeStartDate:    string
  challengeDurationDays: number
}

function formatLabel(dateStr: string, today: string): string {
  if (dateStr === today) return 'Today'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
  })
}

function hrefFor(date: string, today: string): string {
  return date === today ? '/dashboard' : `/dashboard?date=${date}`
}

export function DayStrip({
  viewingDate,
  today,
  challengeStartDate,
  challengeDurationDays,
}: DayStripProps) {
  const [expanded, setExpanded] = useState(false)

  const dayNumber = getDayNumber(challengeStartDate, viewingDate)
  const label = formatLabel(viewingDate, today)

  const endDate = addDays(challengeStartDate, challengeDurationDays - 1)
  const canGoPrev = viewingDate > challengeStartDate
  const canGoNext = viewingDate < today && viewingDate < endDate

  return (
    <div className="flex items-center justify-center gap-2 rounded-xl bg-white/55 p-1.5 text-[12px] text-slate-500">
      {expanded &&
        (canGoPrev ? (
          <Link
            href={hrefFor(addDays(viewingDate, -1), today)}
            aria-label="Previous day"
            className="px-1 tracking-[0.15em] text-slate-500 hover:text-slate-700"
          >
            ‹
          </Link>
        ) : (
          <span aria-hidden className="px-1 tracking-[0.15em] opacity-25">
            ‹
          </span>
        ))}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2"
        aria-expanded={expanded}
      >
        <b className="text-slate-700 tabular-nums">
          Day {dayNumber} of {challengeDurationDays}
        </b>
        <span>·</span>
        <span>
          {label} {expanded ? '▴' : '▾'}
        </span>
      </button>

      {expanded &&
        (canGoNext ? (
          <Link
            href={hrefFor(addDays(viewingDate, 1), today)}
            aria-label="Next day"
            className="px-1 tracking-[0.15em] text-slate-500 hover:text-slate-700"
          >
            ›
          </Link>
        ) : (
          <span aria-hidden className="px-1 tracking-[0.15em] opacity-25">
            ›
          </span>
        ))}

      {expanded && (
        <Link href="/history" className="ml-1 font-medium text-slate-600 hover:text-slate-800">
          History
        </Link>
      )}
    </div>
  )
}
