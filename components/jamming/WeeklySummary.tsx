import type { DayStatus, PulseCheck, PulseState } from '@/lib/types'

const PULSE_LABEL: Record<PulseState, string> = {
  smooth_sailing:  'Smooth Sailing',
  rough_waters:    'Rough Waters',
  taking_on_water: 'Taking On Water',
}

const PULSE_COLOR: Record<PulseState, string> = {
  smooth_sailing:  'bg-emerald-100 text-emerald-700 border-emerald-300',
  rough_waters:    'bg-amber-100 text-amber-700 border-amber-300',
  taking_on_water: 'bg-red-100 text-red-700 border-red-300',
}

const PULSE_ICON: Record<PulseState, string> = {
  smooth_sailing:  '⛵',
  rough_waters:    '🌊',
  taking_on_water: '🆘',
}

interface Props {
  weekNumber:   number
  startDate:    string
  dayStatuses:  Record<string, DayStatus>
  pillars:      string[]
  pulseHistory: PulseCheck[]
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

export default function WeeklySummary({
  weekNumber, startDate, dayStatuses, pillars, pulseHistory,
}: Props) {
  const weekStart = (weekNumber - 1) * 7
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    addDays(startDate, weekStart + i)
  )

  const completeDays = weekDates.filter(d => dayStatuses[d] === 'complete').length
  const missedDays   = weekDates.filter(d => dayStatuses[d] === 'missed').length
  const weekPulses   = pulseHistory.filter(p => p.week_number === weekNumber)

  return (
    <div className="bg-white border border-[var(--card-border)] rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
          Week {weekNumber} Summary
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {completeDays}/7 days
        </p>
      </div>

      {/* Day dots */}
      <div className="flex gap-1.5">
        {weekDates.map(date => {
          const status = dayStatuses[date]
          if (!status || status === 'future') {
            return <div key={date} className="flex-1 h-2 rounded-full bg-gray-200" />
          }
          return (
            <div
              key={date}
              className={`flex-1 h-2 rounded-full ${
                status === 'complete' ? 'bg-emerald-500' :
                status === 'today'   ? 'bg-purple-500'  :
                'bg-gray-200'
              }`}
            />
          )
        })}
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-xs">
        <span className="text-emerald-600 font-bold">{completeDays} complete</span>
        {missedDays > 0 && (
          <span className="text-[var(--text-secondary)]">{missedDays} missed</span>
        )}
        <span className="text-[var(--text-muted)]">{pillars.length} pillars</span>
      </div>

      {weekPulses.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {weekPulses.map(p => (
            <span
              key={p.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${PULSE_COLOR[p.pulse_state]}`}
            >
              <span>{PULSE_ICON[p.pulse_state]}</span>
              {PULSE_LABEL[p.pulse_state]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
