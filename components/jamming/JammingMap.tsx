import type { DayStatus } from '@/lib/types'

const MILESTONES: Record<number, string> = {
  7:  'Week 1',
  14: 'Week 2',
  21: 'Week 3',
}

const STATUS_STYLE: Record<DayStatus, string> = {
  complete: 'bg-emerald-500 border-emerald-400',
  missed:   'bg-gray-100 border-gray-300',
  today:    'bg-purple-600 border-purple-400 ring-2 ring-purple-400 ring-offset-1 ring-offset-white',
  future:   'bg-gray-50 border-gray-200',
}

const STATUS_ICON: Record<DayStatus, string> = {
  complete: '✓',
  missed:   '–',
  today:    '•',
  future:   '',
}

interface Props {
  startDate:    string
  durationDays: number
  dayStatuses:  Record<string, DayStatus>
  dayNumber:    number
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

export default function JammingMap({ startDate, durationDays, dayStatuses, dayNumber }: Props) {
  const weeks = Math.ceil(durationDays / 7)

  return (
    <div className="space-y-4">
      {Array.from({ length: weeks }, (_, weekIdx) => {
        const weekStart = weekIdx * 7
        const weekDays  = Array.from(
          { length: Math.min(7, durationDays - weekStart) },
          (_, i) => weekStart + i + 1
        )

        return (
          <div key={weekIdx} className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Week {weekIdx + 1}
            </p>
            <div className="flex gap-1.5">
              {weekDays.map(day => {
                const date   = addDays(startDate, day - 1)
                const status = dayStatuses[date] ?? 'future'
                const isLast = day === durationDays

                return (
                  <div key={day} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className={`w-full aspect-square rounded-xl border-2 flex items-center justify-center text-xs font-bold transition-all ${STATUS_STYLE[status]}`}
                    >
                      <span className={
                        status === 'complete' ? 'text-white' :
                        status === 'missed'   ? 'text-gray-400' :
                                               'text-white'
                      }>
                        {STATUS_ICON[status] || (status === 'future' ? '' : String(day))}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{day}</span>
                    {(isLast || MILESTONES[day]) && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-purple-600">
                        {isLast && day !== 7 && day !== 14 ? 'Finish' : MILESTONES[day]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
