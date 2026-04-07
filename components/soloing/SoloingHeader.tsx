'use client'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  dayNumber:    number
  durationDays: number
  pillars:      string[]
  streak:       number
  todayComplete: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SoloingHeader({ dayNumber, durationDays, pillars, streak, todayComplete }: Props) {
  const progress = Math.min(dayNumber / durationDays, 1)
  const pct      = Math.round(progress * 100)

  const streakEmoji = streak >= 21 ? '🎻' : streak >= 7 ? '🔥' : '•'

  const subCopy = todayComplete
    ? 'Living it.'
    : streak >= 21
    ? "This isn't a streak — it's a lifestyle."
    : 'Keep the rhythm going.'

  return (
    <div className="space-y-3">
      {/* Level label */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-500">
          Level 4 — Soloing
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {streakEmoji} {streak} day{streak !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Day count */}
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black text-[var(--text-primary)]">{dayNumber}</span>
        <span className="text-[var(--text-muted)] text-sm">of {durationDays} days</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[var(--card-border)] rounded-full overflow-hidden">
        <div
          className="h-full bg-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Sub-copy */}
      <p className="text-[var(--text-secondary)] text-sm">{subCopy}</p>

      {/* Active pillars */}
      <div className="flex flex-wrap gap-1.5">
        {pillars.map(p => (
          <span
            key={p}
            className="text-[10px] font-bold uppercase tracking-widest text-violet-500"
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  )
}
