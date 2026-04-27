'use client'

import { PILLAR_CONFIG, todayStr, addDays } from '@/lib/constants'
import type { PillarLevel, DurationGoal, PillarDailyEntry, PillarName } from '@/lib/types'

interface Props {
  challengeStartDate: string
  allEntries: PillarDailyEntry[]
  activeGoals: DurationGoal[]
  activePillarLevels: PillarLevel[]
}

const PAD = { l: 35, r: 12, t: 10, b: 28 }
const PLOT_H = 150
const SVG_H = PLOT_H + PAD.t + PAD.b
const DAY_W = 10

export default function HistoryProgressReport({ challengeStartDate, allEntries, activeGoals, activePillarLevels }: Props) {
  const today = todayStr()
  const activePillars = activePillarLevels.map((p) => p.pillar as PillarName)

  // Pre-index entries by "pillar|date" for O(1) lookup instead of O(n) .find() per cell
  const entryIndex = new Map<string, PillarDailyEntry>()
  for (const entry of allEntries) {
    entryIndex.set(`${entry.pillar}|${entry.entry_date}`, entry)
  }

  // Pre-index goals by pillar for O(1) lookup instead of O(n) .filter() per cell
  const goalsByPillar = new Map<PillarName, DurationGoal[]>()
  for (const goal of activeGoals) {
    const pillar = goal.pillar as PillarName
    const existing = goalsByPillar.get(pillar)
    if (existing) existing.push(goal)
    else goalsByPillar.set(pillar, [goal])
  }

  // O(1) completion percentage for a single pillar+date cell
  function getPillarPct(pillar: PillarName, date: string): number {
    const entry = entryIndex.get(`${pillar}|${date}`)
    const pillarGoals = goalsByPillar.get(pillar) ?? []
    if (pillarGoals.length === 0 || !entry) return 0
    const completed = pillarGoals.filter((g) => entry.goal_completions?.[g.id] === true).length
    return Math.round((completed / pillarGoals.length) * 100)
  }

  // Build ordered list of all elapsed challenge days
  const days: string[] = []
  let cursor = challengeStartDate
  while (cursor <= today) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }
  const totalDays = days.length

  // Chart geometry
  const PLOT_W = Math.max(260, (totalDays - 1) * DAY_W)
  const SVG_W = PAD.l + PLOT_W + PAD.r

  function xPos(i: number) {
    if (totalDays <= 1) return PAD.l + PLOT_W / 2
    return PAD.l + (i / (totalDays - 1)) * PLOT_W
  }
  function yPos(pct: number) {
    return PAD.t + (1 - pct / 100) * PLOT_H
  }

  // X-axis label cadence
  const labelEvery = totalDays <= 10 ? 1 : totalDays <= 30 ? 5 : 10

  // Single pass over days × pillars: build polyline points and stats simultaneously.
  // Previously these were two separate loops — each calling getPillarPct with O(n) lookups.
  // Now each cell is computed once with O(1) map lookups.
  const pillarPointsAccum = new Map<PillarName, string[]>()
  const statsAccum = new Map<PillarName, { green: number; yellow: number; red: number; totalPct: number }>()
  for (const pillar of activePillars) {
    pillarPointsAccum.set(pillar, [])
    statsAccum.set(pillar, { green: 0, yellow: 0, red: 0, totalPct: 0 })
  }

  for (let i = 0; i < days.length; i++) {
    const date = days[i]
    for (const pillar of activePillars) {
      const pct = getPillarPct(pillar, date)
      pillarPointsAccum.get(pillar)!.push(`${xPos(i).toFixed(1)},${yPos(pct).toFixed(1)}`)
      const s = statsAccum.get(pillar)!
      s.totalPct += pct
      if (pct >= 80) s.green++
      else if (pct >= 40) s.yellow++
      else s.red++
    }
  }

  const pillarPoints: Record<string, string> = {}
  for (const pillar of activePillars) {
    pillarPoints[pillar] = pillarPointsAccum.get(pillar)!.join(' ')
  }

  const stats = activePillars.map((pillar) => {
    const { green, yellow, red, totalPct } = statsAccum.get(pillar)!
    const avg = totalDays === 0 ? 0 : Math.round(totalPct / totalDays)
    return { pillar, green, yellow, red, avg, total: totalDays }
  })

  return (
    <div className="space-y-4">
      {/* Line chart */}
      <div className="rounded-xl shadow-sm overflow-hidden">
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
            {days.map((_, i) => {
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
            {activePillars.map((pillar) => (
              <polyline
                key={pillar}
                points={pillarPoints[pillar]}
                fill="none"
                stroke={PILLAR_CONFIG[pillar].background}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.85}
              />
            ))}

            {/* Dot when only one day of data */}
            {totalDays === 1 && activePillars.map((pillar) => {
              const pct = getPillarPct(pillar, days[0])
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

      {/* Per-pillar summary stats */}
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
    </div>
  )
}
