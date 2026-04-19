interface DashboardHeaderProps {
  currentDay: number
  durationDays: number
  completionPct: number
  isPaused?: boolean
}

export default function DashboardHeader({
  currentDay,
  durationDays,
  completionPct,
  isPaused = false,
}: DashboardHeaderProps) {
  const hasCheckins = completionPct > 0

  return (
    <div className="bg-white border-b border-slate-200 px-4 pt-3 pb-4">
      <div className="flex items-center gap-2 mb-0.5">
        <p className="text-2xl font-bold text-slate-800">
          Day {currentDay} of {durationDays}
        </p>
        {isPaused && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            Paused
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-3">
        {isPaused
          ? 'Your journey is on hold'
          : hasCheckins
          ? `${completionPct}% complete today`
          : 'Nothing checked in yet'}
      </p>

      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${isPaused ? 'bg-amber-400' : 'bg-emerald-500'}`}
          style={{ width: `${isPaused ? 100 : completionPct}%` }}
        />
      </div>
    </div>
  )
}
