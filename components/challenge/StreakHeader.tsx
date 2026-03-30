'use client'

interface Props {
  dayNumber:          number
  completions:        Record<string, boolean>
  purposeStatement:   string | null
  todayComplete:      boolean
  showCompleteBadge?: boolean
}

const RADIUS       = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const MILESTONE: Record<number, string> = {
  1: 'Day 1 — Start',
  2: 'Day 2 — Adapt',
  3: 'Day 3 — Hard Day',
  4: 'Day 4 — Halfway',
  5: 'Day 5 — Notice',
  6: 'Day 6 — Almost',
  7: 'Day 7 — Done',
}

export default function StreakHeader({ dayNumber, completions, purposeStatement, todayComplete, showCompleteBadge = false }: Props) {
  const isHardDay   = dayNumber === 3
  const progressPct = Math.round((Math.min(dayNumber, 7) / 7) * 100)

  const totalPillars  = Object.keys(completions).length
  const donePillars   = Object.values(completions).filter(Boolean).length
  const todayPct      = totalPillars > 0 ? Math.round((donePillars / totalPillars) * 100) : 0
  const arcOffset     = CIRCUMFERENCE * (1 - todayPct / 100)

  return (
    <div className="space-y-3">
      {/* Day label + streak */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-purple-600">
            7-Day Challenge
          </p>
          <h1 className="text-2xl font-black text-[var(--text-primary)] mt-0.5">
            {MILESTONE[dayNumber] ?? `Day ${dayNumber}`}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Circular today progress */}
          <div className="flex flex-col items-center gap-0.5">
            <svg width="64" height="64" viewBox="0 0 64 64">
              {/* Dark background fill */}
              <circle cx="32" cy="32" r="30" fill="#1e293b" />
              {/* Track ring */}
              <circle
                cx="32" cy="32" r={RADIUS}
                fill="none"
                stroke="#334155"
                strokeWidth="5"
              />
              {/* Progress arc — starts at 12 o'clock */}
              <circle
                cx="32" cy="32" r={RADIUS}
                fill="none"
                stroke="var(--pillar-spiritual-accent)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={arcOffset}
                transform="rotate(-90 32 32)"
              />
              {/* Percentage label */}
              <text
                x="32" y="32"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="var(--pillar-spiritual-accent)"
                fontSize="13"
                fontWeight="bold"
              >
                {todayPct}%
              </text>
            </svg>
            <span className="text-[10px] text-[var(--text-muted)]">today</span>
          </div>
          {showCompleteBadge && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              ✓ Done
            </span>
          )}
        </div>
      </div>

      {/* Progress bar — gradient across all four pillar accents */}
      <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progressPct}%`,
            background: 'linear-gradient(to right, var(--pillar-spiritual-accent), var(--pillar-physical-accent), var(--pillar-nutritional-accent), var(--pillar-personal-accent))',
          }}
        />
      </div>

      {/* Purpose reminder on Day 3 — the hardest day */}
      {isHardDay && purposeStatement && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-1">
          <p className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
            Remember why you started
          </p>
          <p className="text-[var(--text-primary)] text-sm italic">&ldquo;{purposeStatement}&rdquo;</p>
        </div>
      )}

      {/* Today complete banner */}
      {todayComplete && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center gap-2">
          <span className="text-lg">✅</span>
          <span className="text-emerald-700 font-bold text-sm">
            {dayNumber === 7 ? 'Challenge complete! Day 7 done.' : 'Today is done. See you tomorrow.'}
          </span>
        </div>
      )}
    </div>
  )
}
