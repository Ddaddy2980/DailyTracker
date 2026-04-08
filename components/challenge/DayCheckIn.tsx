'use client'

import Image from 'next/image'
import type { PillarName, DurationGoalDestination, RewardType } from '@/lib/types'
import PillarGoalCard from '@/components/challenge/PillarGoalCard'

interface Props {
  pillars:        string[]
  pillarGoals:    Record<string, string>
  completions:    Record<string, boolean>
  isPending:      boolean
  alreadySaved:   boolean
  onToggle:       (pillar: string) => void
  onSave:         () => void
  pillarStates?:  Partial<Record<string, 'anchored' | 'developing' | 'building' | 'dormant'>>
  // ── Grooving+ per-pillar card props (all optional) ─────────────────────────
  pillarLevelSnapshot?:       Record<string, { level: number; state: string }>
  destinationGoalsByPillar?:  Record<string, DurationGoalDestination[]>
  challengeId?:               string
  startDate?:                 string
  endDate?:                   string
  date?:                      string
  dayNumber?:                 number
  durationDays?:              number
  level?:                     number
  onPillarSaved?:             (delta: Record<string, boolean>, newRewards?: RewardType[]) => void
}

const PILLAR_UI: Record<PillarName, { label: string; icon: string; card: string }> = {
  spiritual:   { label: 'Spiritual',   icon: '/spiritual_icon.png',   card: 'pillar-spiritual'   },
  physical:    { label: 'Physical',    icon: '/physical_icon.png',    card: 'pillar-physical'    },
  nutritional: { label: 'Nutritional', icon: '/nutritional_icon.png', card: 'pillar-nutritional' },
  personal:    { label: 'Personal',    icon: '/personal_icon.png',    card: 'pillar-personal'    },
  missional:   { label: 'Missional',   icon: '',                      card: 'pillar-missional'   },
}

const DEFAULT_UI = { label: 'Goal', icon: '', card: 'bg-gray-700' }

function getPillarVariant(
  pillar: string,
  pillarStates?: Partial<Record<string, 'anchored' | 'developing' | 'building' | 'dormant'>>
): 'anchored' | 'developing' | 'building' {
  const state = pillarStates?.[pillar]
  if (state === 'anchored') return 'anchored'
  if (state === 'developing') return 'developing'
  return 'building'
}

function isGroovingPlus(
  pillar: string,
  snapshot?: Record<string, { level: number; state: string }>
): boolean {
  return (snapshot?.[pillar]?.level ?? 0) >= 3
}

export default function DayCheckIn({
  pillars, pillarGoals, completions, isPending, alreadySaved, onToggle, onSave, pillarStates,
  pillarLevelSnapshot, destinationGoalsByPillar, challengeId, startDate, endDate,
  date, dayNumber, durationDays, level, onPillarSaved,
}: Props) {
  // Pillars split by rendering mode
  const groovinPillars = pillarLevelSnapshot
    ? pillars.filter(p => isGroovingPlus(p, pillarLevelSnapshot))
    : []
  const flatPillars = pillars.filter(p => !groovinPillars.includes(p))

  const flatAllDone = flatPillars.length > 0
    ? flatPillars.every(p => completions[p])
    : false
  const flatAnyDone = flatPillars.some(p => completions[p])

  // Whether the global save button should appear (only covers flat-toggle pillars)
  const showGlobalSave = !alreadySaved && flatPillars.length > 0

  // Check whether all per-pillar props are available to render PillarGoalCard
  const canRenderCard = !!(challengeId && startDate && endDate && date && dayNumber != null && durationDays != null && level != null)

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
        Today&apos;s Goals
      </p>

      {pillars.map(pillar => {
        // ── Grooving+ pillar: expandable card ───────────────────────────────
        if (isGroovingPlus(pillar, pillarLevelSnapshot) && canRenderCard) {
          const pillarLevel = pillarLevelSnapshot![pillar]?.level ?? 3
          return (
            <PillarGoalCard
              key={pillar}
              pillar={pillar}
              goals={[pillarGoals[pillar] ?? ''].filter(Boolean)}
              savedCompletions={completions}
              challengeId={challengeId!}
              startDate={startDate!}
              endDate={endDate!}
              date={date!}
              dayNumber={dayNumber!}
              durationDays={durationDays!}
              level={level!}
              pillarLevel={pillarLevel}
              destinationGoals={destinationGoalsByPillar?.[pillar] ?? []}
              onSaved={(delta, newRewards) => {
                onPillarSaved?.(delta, newRewards)
              }}
            />
          )
        }

        // ── Flat toggle pillar (Tuning/Jamming) ─────────────────────────────
        const ui      = PILLAR_UI[pillar as PillarName] ?? DEFAULT_UI
        const complete = completions[pillar] ?? false
        const goal    = pillarGoals[pillar] ?? ''
        const variant = getPillarVariant(pillar, pillarStates)

        if (variant === 'anchored') {
          return (
            <button
              key={pillar}
              onClick={() => onToggle(pillar)}
              disabled={alreadySaved && !complete}
              className={`w-full text-left p-4 rounded-2xl border-2 border-transparent transition-all active:scale-95 ${ui.card}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  complete ? 'bg-emerald-500 border-emerald-400' : 'border-white/60 bg-transparent'
                }`}>
                  {complete && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {ui.icon && <Image src={ui.icon} width={20} height={20} alt={ui.label} className="opacity-90" />}
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white">{ui.label}</p>
                </div>
              </div>
            </button>
          )
        }

        if (variant === 'developing') {
          return (
            <button
              key={pillar}
              onClick={() => onToggle(pillar)}
              disabled={alreadySaved && !complete}
              className={`w-full text-left p-4 rounded-2xl border-2 border-transparent transition-all active:scale-95 opacity-90 ${ui.card}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  complete ? 'bg-emerald-500 border-emerald-400' : 'border-white/60 bg-transparent'
                }`}>
                  {complete && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {ui.icon && <Image src={ui.icon} width={20} height={20} alt={ui.label} className="opacity-90" />}
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white">{ui.label}</p>
                  </div>
                  <p className="text-sm font-semibold leading-snug text-white/80">{goal}</p>
                </div>
              </div>
            </button>
          )
        }

        // Building (default)
        return (
          <button
            key={pillar}
            onClick={() => onToggle(pillar)}
            disabled={alreadySaved && !complete}
            className={`w-full text-left p-4 rounded-2xl border-2 border-transparent transition-all active:scale-95 ${ui.card}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                complete ? 'bg-emerald-500 border-emerald-400' : 'border-white/60 bg-transparent'
              }`}>
                {complete && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {ui.icon && <Image src={ui.icon} width={20} height={20} alt={ui.label} className="opacity-90" />}
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white">{ui.label}</p>
                </div>
                <p className="text-sm font-semibold leading-snug text-white">{goal}</p>
              </div>
            </div>
          </button>
        )
      })}

      {showGlobalSave && (
        <button
          onClick={onSave}
          disabled={!flatAnyDone || isPending}
          className="w-full py-4 mt-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-lg text-white transition-colors"
        >
          {isPending ? 'Saving…' : flatAllDone ? 'Save today ✓' : 'Save progress'}
        </button>
      )}
    </div>
  )
}
