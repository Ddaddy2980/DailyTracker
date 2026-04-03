'use client'

import type { PillarName, PillarLevel, OperatingState } from '@/lib/types'

interface Props {
  pillarLevels: PillarLevel[]
  pillarStates: Record<PillarName, OperatingState>
  lifeOnPurposeScore: number | null
}

const PILLAR_ORDER: PillarName[] = ['spiritual', 'physical', 'nutritional', 'personal', 'missional']

const LEVEL_NAMES: Record<number, string> = {
  1: 'Tuning', 2: 'Jamming', 3: 'Grooving', 4: 'Soloing',
}

const PILLAR_META: Record<PillarName, {
  emoji: string
  label: string
  text: string
  cardBuilding: string
  cardDeveloping: string
  cardAnchored: string
  borderBuilding: string
  borderDeveloping: string
  gauge: string
  badgeDevelopingBg: string
  badgeDevelopingText: string
  badgeBuildingBg: string
}> = {
  spiritual: {
    emoji: '🙏', label: 'Spiritual', text: 'text-purple-600',
    cardBuilding: 'bg-purple-50', cardDeveloping: 'bg-white', cardAnchored: 'bg-slate-50',
    borderBuilding: 'border-purple-400', borderDeveloping: 'border-purple-200',
    gauge: 'bg-purple-600',
    badgeDevelopingBg: 'bg-purple-100', badgeDevelopingText: 'text-purple-700',
    badgeBuildingBg: 'bg-purple-600',
  },
  physical: {
    emoji: '💪', label: 'Physical', text: 'text-emerald-600',
    cardBuilding: 'bg-emerald-50', cardDeveloping: 'bg-white', cardAnchored: 'bg-slate-50',
    borderBuilding: 'border-emerald-400', borderDeveloping: 'border-emerald-200',
    gauge: 'bg-emerald-600',
    badgeDevelopingBg: 'bg-emerald-100', badgeDevelopingText: 'text-emerald-700',
    badgeBuildingBg: 'bg-emerald-600',
  },
  nutritional: {
    emoji: '🥗', label: 'Nutritional', text: 'text-amber-500',
    cardBuilding: 'bg-amber-50', cardDeveloping: 'bg-white', cardAnchored: 'bg-slate-50',
    borderBuilding: 'border-amber-400', borderDeveloping: 'border-amber-200',
    gauge: 'bg-amber-500',
    badgeDevelopingBg: 'bg-amber-100', badgeDevelopingText: 'text-amber-700',
    badgeBuildingBg: 'bg-amber-500',
  },
  personal: {
    emoji: '📝', label: 'Personal', text: 'text-blue-600',
    cardBuilding: 'bg-blue-50', cardDeveloping: 'bg-white', cardAnchored: 'bg-slate-50',
    borderBuilding: 'border-blue-400', borderDeveloping: 'border-blue-200',
    gauge: 'bg-blue-600',
    badgeDevelopingBg: 'bg-blue-100', badgeDevelopingText: 'text-blue-700',
    badgeBuildingBg: 'bg-blue-600',
  },
  missional: {
    emoji: '🤝', label: 'Missional', text: 'text-teal-600',
    cardBuilding: 'bg-teal-50', cardDeveloping: 'bg-white', cardAnchored: 'bg-slate-50',
    borderBuilding: 'border-teal-400', borderDeveloping: 'border-teal-200',
    gauge: 'bg-teal-600',
    badgeDevelopingBg: 'bg-teal-100', badgeDevelopingText: 'text-teal-700',
    badgeBuildingBg: 'bg-teal-600',
  },
}

function getCardClasses(state: OperatingState, meta: typeof PILLAR_META[PillarName]): string {
  if (state === 'anchored')   return `border-2 border-slate-200 ${meta.cardAnchored}`
  if (state === 'developing') return `border-2 ${meta.borderDeveloping} ${meta.cardDeveloping}`
  if (state === 'building')   return `border-2 ${meta.borderBuilding} ${meta.cardBuilding}`
  return 'border-2 border-gray-200 bg-gray-50' // dormant
}

export default function FivePillarDashboard({ pillarLevels, pillarStates, lifeOnPurposeScore }: Props) {
  const levelMap = Object.fromEntries(
    pillarLevels.map((pl) => [pl.pillar, pl])
  ) as Partial<Record<PillarName, PillarLevel>>

  const allActive = PILLAR_ORDER.every((p) => pillarStates[p] !== 'dormant')

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-6 py-10">

        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Five-Pillar Dashboard</h1>
        <p className="text-sm text-gray-500 mb-8">Your whole life, living on purpose.</p>

        {/* Life on Purpose Score */}
        <div className="mb-8 p-5 rounded-2xl border border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Life on Purpose Score
          </p>
          {allActive && lifeOnPurposeScore !== null ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-purple-500 via-teal-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${lifeOnPurposeScore}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-700 w-8 text-right">
                {lifeOnPurposeScore}
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              Your Life on Purpose Score will appear when all five pillars are active.
            </p>
          )}
        </div>

        {/* Pillar cards */}
        <div className="flex flex-col gap-4">
          {PILLAR_ORDER.map((pillar) => {
            const state = pillarStates[pillar]
            const row   = levelMap[pillar]
            const meta  = PILLAR_META[pillar]
            const isDormant = state === 'dormant'

            return (
              <div key={pillar} className={`rounded-2xl p-5 ${getCardClasses(state, meta)}`}>

                {/* Pillar header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-bold ${isDormant ? 'text-gray-400' : meta.text}`}>
                      {meta.emoji} {meta.label}
                    </span>
                    {!isDormant && row && (
                      <span className={`text-xs font-medium ${meta.text}`}>
                        {LEVEL_NAMES[row.level] ?? '—'}
                      </span>
                    )}
                  </div>

                  {/* State badge */}
                  {state === 'anchored' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">
                      Anchored
                    </span>
                  )}
                  {state === 'developing' && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.badgeDevelopingBg} ${meta.badgeDevelopingText}`}>
                      Developing
                    </span>
                  )}
                  {state === 'building' && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.badgeBuildingBg} text-white`}>
                      Building
                    </span>
                  )}
                  {state === 'dormant' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-400 font-medium">
                      This pillar is waiting.
                    </span>
                  )}
                </div>

                {/* Consistency Gauge */}
                {!isDormant && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Consistency</p>
                    {row?.gauge_score !== null && row?.gauge_score !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${meta.gauge}`}
                            style={{ width: `${row.gauge_score}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-6 text-right">{row.gauge_score}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        Gauge active after first week closes
                      </p>
                    )}
                  </div>
                )}

              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
