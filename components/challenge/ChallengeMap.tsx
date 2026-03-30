'use client'

import type { DayStatus } from '@/lib/types'

interface Props {
  startDate:   string
  dayNumber:   number
  dayStatuses: Record<string, DayStatus>
  compact?:    boolean
}

const MILESTONES = ['Start', 'Adapt', 'Hard Day', 'Halfway', 'Notice', 'Almost', 'Done']

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

export default function ChallengeMap({ startDate, dayNumber, dayStatuses, compact = false }: Props) {
  return (
    <div className={`bg-white border border-[var(--card-border)] rounded-2xl ${compact ? 'p-2' : 'p-4'}`}>
      {!compact && (
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-4">
          Your 7-Day Map
        </p>
      )}

      <div className={`flex items-start justify-between ${compact ? 'gap-0.5' : 'gap-1'}`}>
        {Array.from({ length: 7 }, (_, i) => {
          const day    = i + 1
          const date   = addDays(startDate, i)
          const status = dayStatuses[date] ?? 'future'
          const isToday = day === dayNumber

          return (
            <div key={day} className="flex flex-col items-center gap-1.5 flex-1">
              <div className="relative w-full flex items-center justify-center">
                {i > 0 && (
                  <div className={`absolute right-1/2 -translate-y-1/2 w-full ${
                    compact ? 'top-4 h-px' : 'top-5 h-0.5'
                  } ${status === 'complete' ? 'bg-purple-400' : 'bg-gray-200'}`} />
                )}

                <div className={`relative z-10 rounded-full flex items-center justify-center font-black border-2 transition-all ${
                  compact ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
                } ${
                  status === 'complete' ? 'bg-purple-600 border-purple-500 text-white' :
                  status === 'today'    ? 'bg-white border-purple-400 text-purple-600 ring-2 ring-purple-400 ring-offset-2 ring-offset-white' :
                  status === 'missed'   ? 'bg-gray-100 border-red-300 text-gray-400' :
                                          'bg-gray-100 border-gray-200 text-gray-400'
                }`}>
                  {status === 'complete' ? '✓' : day}
                </div>
              </div>

              <span className={`text-center leading-tight font-semibold transition-colors ${compact ? 'text-[8px]' : 'text-[9px]'} ${
                isToday               ? 'text-purple-600'              :
                status === 'complete' ? 'text-[var(--text-secondary)]' :
                                        'text-[var(--text-muted)]'
              }`}>
                {MILESTONES[i]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
