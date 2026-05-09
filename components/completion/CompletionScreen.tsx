import { fmtDate } from '@/lib/constants'
import PillarStatRow, { type PillarStat } from './PillarStatRow'
import RestartFlow from './RestartFlow'

export type { PillarStat } from './PillarStatRow'

export interface CompletionScreenProps {
  challengeDurationDays: number
  startDate:             string   // YYYY-MM-DD
  completedAt:           string   // YYYY-MM-DD
  overallPct:            number   // 0–100
  pillarStats:           PillarStat[]
}

export default function CompletionScreen({
  challengeDurationDays,
  startDate,
  completedAt,
  overallPct,
  pillarStats,
}: CompletionScreenProps) {
  return (
    <div className="min-h-screen bg-[#EBEBEC] px-4 pt-6 pb-24">
      {/* Celebration header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">You did it.</h1>
        <p className="text-base text-slate-500 leading-relaxed max-w-xs mx-auto">
          {challengeDurationDays} days of showing up for the life you want to live.
        </p>
      </div>

      {/* Challenge summary card */}
      <div className="bg-white rounded-2xl px-5 py-5 mb-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Challenge Summary
        </p>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-slate-800">{challengeDurationDays} Days</p>
            <p className="text-sm text-slate-400">
              {fmtDate(startDate)} – {fmtDate(completedAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-emerald-600">{overallPct}%</p>
            <p className="text-xs text-slate-400">overall consistency</p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Per-pillar stats */}
      {pillarStats.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">
            Your Pillars
          </p>
          {pillarStats.map((stat) => (
            <PillarStatRow key={stat.pillar} {...stat} />
          ))}
        </div>
      )}

      {/* Restart flow CTAs */}
      <RestartFlow challengeDurationDays={challengeDurationDays} />
    </div>
  )
}
