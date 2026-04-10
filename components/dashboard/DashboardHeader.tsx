import Image from 'next/image'

interface DashboardHeaderProps {
  currentDay: number
  durationDays: number
  completionPct: number
}

export default function DashboardHeader({
  currentDay,
  durationDays,
  completionPct,
}: DashboardHeaderProps) {
  const hasCheckins = completionPct > 0

  return (
    <div className="bg-white border-b border-slate-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <Image
          src="/Logo.png"
          alt="Daily Consistency Tracker"
          width={40}
          height={40}
          className="rounded-lg"
        />
        <div>
          <p className="text-2xl font-bold text-slate-800">
            Day {currentDay} of {durationDays}
          </p>
          <p className="text-sm text-slate-500">
            {hasCheckins
              ? `${completionPct}% complete today`
              : 'Nothing checked in yet'}
          </p>
        </div>
      </div>

      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${completionPct}%` }}
        />
      </div>
    </div>
  )
}
