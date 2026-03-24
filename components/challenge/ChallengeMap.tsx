'use client'

import type { DayStatus } from '@/lib/types'

interface Props {
  startDate:  string
  dayNumber:  number
  dayStatuses: Record<string, DayStatus>
}

const MILESTONES = ['Start', 'Adapt', 'Hard Day', 'Halfway', 'Notice', 'Almost', 'Done']

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

export default function ChallengeMap({ startDate, dayNumber, dayStatuses }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
        Your 7-Day Map
      </p>

      <div className="flex items-start justify-between gap-1">
        {Array.from({ length: 7 }, (_, i) => {
          const day    = i + 1
          const date   = addDays(startDate, i)
          const status = dayStatuses[date] ?? 'future'
          const isToday = day === dayNumber

          return (
            <div key={day} className="flex flex-col items-center gap-1.5 flex-1">
              {/* Connector line (except first) */}
              <div className="relative w-full flex items-center justify-center">
                {i > 0 && (
                  <div className={`absolute right-1/2 top-5 h-0.5 w-full -translate-y-1/2 ${
                    status === 'complete' ? 'bg-purple-600' : 'bg-slate-700'
                  }`} />
                )}

                {/* Day circle */}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all ${
                  status === 'complete' ? 'bg-purple-600 border-purple-500 text-white' :
                  status === 'today'    ? 'bg-slate-950 border-purple-400 text-purple-300 ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900' :
                  status === 'missed'   ? 'bg-slate-800 border-red-900 text-slate-500' :
                                          'bg-slate-800 border-slate-700 text-slate-500'
                }`}>
                  {status === 'complete' ? '✓' : day}
                </div>
              </div>

              {/* Milestone label */}
              <span className={`text-center leading-tight font-semibold transition-colors ${
                isToday           ? 'text-purple-300 text-[9px]' :
                status === 'complete' ? 'text-slate-400 text-[9px]' :
                                    'text-slate-600 text-[9px]'
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
