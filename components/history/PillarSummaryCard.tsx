import { PILLAR_CONFIG } from '@/lib/constants'
import type { PillarName } from '@/lib/types'

export interface PillarStats {
  pillar: PillarName
  green:  number
  yellow: number
  red:    number
  avg:    number
  total:  number
}

interface PillarSummaryCardProps {
  stats: PillarStats[]
}

export default function PillarSummaryCard({ stats }: PillarSummaryCardProps) {
  return (
    <div className="rounded-xl shadow-sm overflow-hidden">
      <div className="bg-slate-700 px-4 pt-3 pb-2">
        <p className="text-sm font-semibold text-white">Pillar Summary</p>
      </div>
      <div>
        {stats.map(({ pillar, green, yellow, red, avg, total }) => (
          <div key={pillar} className="px-4 py-3" style={{ backgroundColor: PILLAR_CONFIG[pillar].background }}>
            <div className="flex items-baseline justify-between mb-2">
              <p
                className="text-sm font-semibold capitalize"
                style={{ color: PILLAR_CONFIG[pillar].title }}
              >
                {pillar}
              </p>
              <p className="text-xs" style={{ color: PILLAR_CONFIG[pillar].subtitle }}>avg {avg}%</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span style={{ color: PILLAR_CONFIG[pillar].subtitle }}>Green</span>
                </div>
                <span className="font-semibold text-emerald-300">{green}</span>
                <span className="ml-1" style={{ color: PILLAR_CONFIG[pillar].subtitle }}>
                  {total === 0 ? '0' : Math.round((green / total) * 100)}%
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span style={{ color: PILLAR_CONFIG[pillar].subtitle }}>Yellow</span>
                </div>
                <span className="font-semibold text-amber-300">{yellow}</span>
                <span className="ml-1" style={{ color: PILLAR_CONFIG[pillar].subtitle }}>
                  {total === 0 ? '0' : Math.round((yellow / total) * 100)}%
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  <span style={{ color: PILLAR_CONFIG[pillar].subtitle }}>Red</span>
                </div>
                <span className="font-semibold text-red-300">{red}</span>
                <span className="ml-1" style={{ color: PILLAR_CONFIG[pillar].subtitle }}>
                  {total === 0 ? '0' : Math.round((red / total) * 100)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
