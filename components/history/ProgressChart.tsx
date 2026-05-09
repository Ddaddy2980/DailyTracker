import { PILLAR_CONFIG } from '@/lib/constants'
import type { PillarName } from '@/lib/types'

interface ProgressChartProps {
  activePillars: PillarName[]
  pillarPcts:    Record<string, number[]>
}

const PAD = { l: 35, r: 12, t: 10, b: 28 }
const PLOT_H = 150
const SVG_H = PLOT_H + PAD.t + PAD.b
const DAY_W = 10

export default function ProgressChart({ activePillars, pillarPcts }: ProgressChartProps) {
  const totalDays = activePillars.length > 0 ? (pillarPcts[activePillars[0]]?.length ?? 0) : 0
  const PLOT_W = Math.max(260, (totalDays - 1) * DAY_W)
  const SVG_W = PAD.l + PLOT_W + PAD.r

  function xPos(i: number) {
    if (totalDays <= 1) return PAD.l + PLOT_W / 2
    return PAD.l + (i / (totalDays - 1)) * PLOT_W
  }
  function yPos(pct: number) {
    return PAD.t + (1 - pct / 100) * PLOT_H
  }

  const labelEvery = totalDays <= 10 ? 1 : totalDays <= 30 ? 5 : 10

  return (
    <div className="rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-700 px-4 pt-3 pb-2">
        <p className="text-sm font-semibold text-white">Pillar Progress</p>
        <p className="text-xs text-slate-400">Day 1 – {totalDays}</p>
      </div>

      <div className="bg-slate-600 overflow-x-auto px-3 pt-3">
        <svg width={SVG_W} height={SVG_H}>
          {/* Horizontal grid lines + y-axis labels */}
          {[0, 25, 50, 75, 100].map((pct) => (
            <g key={pct}>
              <line
                x1={PAD.l} y1={yPos(pct)}
                x2={SVG_W - PAD.r} y2={yPos(pct)}
                stroke="#94a3b8" strokeWidth="1"
              />
              <text
                x={PAD.l - 4} y={yPos(pct)}
                textAnchor="end" dominantBaseline="middle"
                fill="#cbd5e1" fontSize="8"
              >
                {pct}%
              </text>
            </g>
          ))}

          {/* X-axis day labels */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const isFirst = i === 0
            const isLast = i === totalDays - 1
            const isLabeled = isFirst || isLast || (i + 1) % labelEvery === 0
            if (!isLabeled) return null
            return (
              <text
                key={i}
                x={xPos(i)} y={SVG_H - 6}
                textAnchor="middle" fill="#cbd5e1" fontSize="8"
              >
                {i + 1}
              </text>
            )
          })}

          {/* One polyline per active pillar */}
          {activePillars.map((pillar) => {
            const pcts = pillarPcts[pillar] ?? []
            const points = pcts.map((pct, i) => `${xPos(i).toFixed(1)},${yPos(pct).toFixed(1)}`).join(' ')
            return (
              <polyline
                key={pillar}
                points={points}
                fill="none"
                stroke={PILLAR_CONFIG[pillar].background}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.85}
              />
            )
          })}

          {/* Dot when only one day of data */}
          {totalDays === 1 && activePillars.map((pillar) => {
            const pct = pillarPcts[pillar]?.[0] ?? 0
            return (
              <circle
                key={pillar}
                cx={xPos(0)} cy={yPos(pct)} r="4"
                fill={PILLAR_CONFIG[pillar].background}
              />
            )
          })}
        </svg>
      </div>

      {/* Pillar color legend */}
      <div className="bg-slate-600 flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
        {activePillars.map((pillar) => (
          <div key={pillar} className="flex items-center gap-1.5">
            <div
              className="w-4 h-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: PILLAR_CONFIG[pillar].background }}
            />
            <span className="text-xs text-slate-200 capitalize">{pillar}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
