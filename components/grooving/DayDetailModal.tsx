'use client'

const PILLAR_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  spiritual:   { label: 'Spiritual',   color: 'text-purple-400',  dot: 'bg-purple-500' },
  physical:    { label: 'Physical',    color: 'text-emerald-400', dot: 'bg-emerald-500' },
  nutritional: { label: 'Nutritional', color: 'text-amber-400',   dot: 'bg-amber-500' },
  personal:    { label: 'Personal',    color: 'text-blue-400',    dot: 'bg-blue-500' },
}

interface Props {
  date:        string   // 'YYYY-MM-DD'
  dayNumber:   number
  pillars:     string[]
  completions: Record<string, boolean>
  onClose:     () => void
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function DayDetailModal({ date, dayNumber, pillars, completions, onClose }: Props) {
  const allComplete  = pillars.every(p => completions[p])
  const noneComplete = pillars.every(p => !completions[p])
  const doneCount    = pillars.filter(p => completions[p]).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-t-3xl px-6 pt-5 pb-10 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-1" />

        {/* Date */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Day {dayNumber}</p>
          <p className="text-white font-black text-lg mt-0.5">{formatDate(date)}</p>
        </div>

        {/* Summary pill */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide
          ${allComplete  ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700' :
            noneComplete ? 'bg-red-950/50 text-red-400 border border-red-900' :
                           'bg-amber-900/50 text-amber-400 border border-amber-700'}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${allComplete ? 'bg-emerald-400' : noneComplete ? 'bg-red-400' : 'bg-amber-400'}`} />
          {allComplete  ? 'All pillars complete' :
           noneComplete ? 'Missed' :
                          `${doneCount} of ${pillars.length} pillars`}
        </div>

        {/* Per-pillar rows */}
        <div className="space-y-3">
          {pillars.map(p => {
            const cfg = PILLAR_CONFIG[p]
            const done = completions[p]
            return (
              <div key={p} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${done ? cfg.dot : 'bg-slate-700'}`} />
                  <span className={`text-sm font-semibold ${done ? cfg.color : 'text-slate-500'}`}>
                    {cfg.label}
                  </span>
                </div>
                <span className={`text-xs font-bold ${done ? 'text-white' : 'text-slate-600'}`}>
                  {done ? '✓ Done' : '—'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full mt-2 py-3 rounded-2xl bg-slate-800 text-slate-400 text-sm font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  )
}
