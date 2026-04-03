import type { PillarName } from '@/lib/types'

const PILLAR_COLOR: Record<PillarName, string> = {
  spiritual:   'text-[#4a90d9]',
  physical:    'text-[#6b8dd6]',
  nutritional: 'text-[#d4863a]',
  personal:    'text-[#5aab6e]',
  missional:   'text-teal-400',
}

interface Props {
  dayNumber:         number
  durationDays:      number
  pillars:           string[]
  streak:            number
  purposeStatement:  string | null
  todayComplete:     boolean
}

export default function JammingHeader({
  dayNumber, durationDays, pillars, streak, purposeStatement, todayComplete,
}: Props) {
  const weekNumber  = Math.ceil(dayNumber / 7)
  const totalWeeks  = Math.ceil(durationDays / 7)
  const progressPct = Math.round((Math.min(dayNumber, durationDays) / durationDays) * 100)

  return (
    <div className="space-y-3">
      {/* Level label + day counter */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-600">
          Level 2 — Jamming
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Day {Math.min(dayNumber, durationDays)}/{durationDays} · Week {weekNumber}/{totalWeeks}
        </p>
      </div>

      {/* Streak + status */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">{todayComplete ? '✅' : streak > 0 ? '🔥' : '⭕'}</span>
        <div>
          <p className="text-[var(--text-primary)] font-black text-lg leading-none">
            {todayComplete ? 'Done today' : streak > 0 ? `${streak}-day streak` : 'Day 1'}
          </p>
          <p className="text-[var(--text-secondary)] text-xs mt-0.5">
            {todayComplete ? 'Keep the streak alive' : 'Check in to keep it going'}
          </p>
        </div>
      </div>

      {/* Pillars */}
      <div className="flex flex-wrap gap-2">
        {pillars.map(p => (
          <span
            key={p}
            className={`text-xs font-bold uppercase tracking-wide ${PILLAR_COLOR[p as PillarName] ?? 'text-[var(--text-muted)]'}`}
          >
            {p}
          </span>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progressPct}%`,
            background: 'linear-gradient(to right, var(--pillar-spiritual-accent), var(--pillar-physical-accent), var(--pillar-nutritional-accent), var(--pillar-personal-accent))',
          }}
        />
      </div>

      {/* Purpose statement */}
      {purposeStatement && (
        <p className="text-[var(--text-secondary)] text-sm italic leading-snug border-l-2 border-gray-300 pl-3">
          &ldquo;{purposeStatement}&rdquo;
        </p>
      )}
    </div>
  )
}
