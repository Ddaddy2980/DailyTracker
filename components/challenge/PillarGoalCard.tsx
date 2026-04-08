'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { submitCheckin } from '@/app/actions'
import { PILLAR_CONFIG } from '@/lib/constants'
import { daysUntil } from '@/lib/utils'
import type { DurationGoalDestination, RewardType } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  pillar:             string
  goals:              string[]
  savedCompletions:   Record<string, boolean>   // all pillars current state
  challengeId:        string
  startDate:          string
  endDate:            string
  date:               string
  dayNumber:          number
  durationDays:       number
  level:              number
  pillarLevel?:       number                    // from pillar_level_snapshot; >= 3 = Grooving+
  destinationGoals?:  DurationGoalDestination[] // active goals from duration_goal_destinations
  onSaved:            (delta: Record<string, boolean>, newRewards?: RewardType[]) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type PillarConfig = typeof PILLAR_CONFIG[keyof typeof PILLAR_CONFIG]

const FALLBACK_CONFIG: PillarConfig = PILLAR_CONFIG.spiritual

function getPillarConfig(pillar: string): PillarConfig {
  return (PILLAR_CONFIG as Record<string, PillarConfig>)[pillar] ?? FALLBACK_CONFIG
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PillarGoalCard({
  pillar, goals, savedCompletions, challengeId, startDate, endDate,
  date, dayNumber, durationDays, level, pillarLevel, destinationGoals, onSaved,
}: Props) {
  const cfg        = getPillarConfig(pillar)
  const initDone   = savedCompletions[pillar] ?? false

  const [isExpanded,    setIsExpanded]    = useState(false)
  const [goalStates,    setGoalStates]    = useState<boolean[]>(() => goals.map(() => initDone))
  const [destStates,    setDestStates]    = useState<boolean[]>(
    () => (destinationGoals ?? []).map(() => false)
  )
  const [lastSavedDone, setLastSavedDone] = useState(initDone)
  const [showConfirm,   setShowConfirm]   = useState(false)
  const [isPending,     startTransition]  = useTransition()

  const doneCount  = goalStates.filter(Boolean).length
  const anyChecked = doneCount > 0
  const hasChanges = goalStates.some(g => g !== lastSavedDone)

  const activeDestGoals = (destinationGoals ?? []).filter(g => g.status === 'active')
  const showDestSection = (pillarLevel ?? 0) >= 3 && activeDestGoals.length > 0

  const goalCountLabel = `${goals.length} active goal${goals.length !== 1 ? 's' : ''}`

  // ── Handlers ────────────────────────────────────────────────────────────────

  function toggleGoal(i: number) {
    if (lastSavedDone) return
    setGoalStates(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  function toggleDest(i: number) {
    setDestStates(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  function handleHeaderTap() {
    if (!isExpanded) {
      setIsExpanded(true)
      return
    }
    if (hasChanges) {
      setShowConfirm(true)
    } else {
      setIsExpanded(false)
    }
  }

  function handleDiscard() {
    setGoalStates(goals.map(() => lastSavedDone))
    setShowConfirm(false)
    setIsExpanded(false)
  }

  function performSave(collapse: boolean) {
    startTransition(async () => {
      const result = await submitCheckin({
        date, challengeId, startDate, endDate,
        completions: { ...savedCompletions, [pillar]: anyChecked },
        dayNumber, durationDays, level,
      })
      setLastSavedDone(anyChecked)
      setGoalStates(goals.map(() => anyChecked))
      setShowConfirm(false)
      onSaved({ [pillar]: anyChecked }, result.newRewards)
      if (collapse) setIsExpanded(false)
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: cfg.background }}>

      {/* Collapsed header — always visible */}
      <button
        onClick={handleHeaderTap}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <Image
          src={cfg.icon}
          width={22}
          height={22}
          alt={cfg.label}
          className="shrink-0 opacity-90"
        />
        <p className="flex-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: cfg.title }}>
          {cfg.label}
        </p>
        <span className="text-xs font-medium shrink-0" style={{ color: cfg.subtitle }}>
          {goalCountLabel}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          style={{ color: cfg.subtitle }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">

          {/* Duration goal rows */}
          {goals.map((goal, i) => (
            <button
              key={i}
              onClick={() => toggleGoal(i)}
              disabled={lastSavedDone}
              className="w-full flex items-center gap-3 text-left disabled:cursor-default"
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                goalStates[i]
                  ? 'bg-emerald-500 border-emerald-400'
                  : 'border-white/60 bg-transparent'
              }`}>
                {goalStates[i] && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <p className="text-sm font-medium text-white leading-snug">{goal}</p>
            </button>
          ))}

          {/* Destination goals — Grooving level and above only */}
          {showDestSection && (
            <>
              <div className="border-t border-white/20 pt-3 mt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: cfg.subtitle }}>
                  Direction
                </p>
                {activeDestGoals.map((dg, i) => (
                  <button
                    key={dg.id}
                    onClick={() => toggleDest(i)}
                    className="w-full flex items-center gap-3 text-left mb-2 last:mb-0"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      destStates[i]
                        ? 'bg-white/30 border-white/60'
                        : 'border-white/40 bg-transparent'
                    }`}>
                      {destStates[i] && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm text-white/80 leading-snug">{dg.goal_name}</span>
                      {daysUntil(dg.end_date) <= 7 && (
                        <span className="text-xs" style={{ color: cfg.subtitle }}>Ending soon</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Save button — hidden once this pillar is saved */}
          {!lastSavedDone && (
            <button
              onClick={() => performSave(true)}
              disabled={isPending || !anyChecked}
              className="w-full mt-1 py-2.5 rounded-xl font-bold text-sm text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: cfg.saveButton }}
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          )}

          {/* Unsaved changes prompt */}
          {showConfirm && (
            <div className="bg-black/20 rounded-xl p-3 space-y-2">
              <p className="text-sm text-white font-medium">You have unsaved changes.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => performSave(true)}
                  disabled={isPending}
                  className="flex-1 py-2 rounded-lg text-sm font-bold text-white bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-40"
                >
                  Save and close
                </button>
                <button
                  onClick={handleDiscard}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white transition-colors"
                >
                  Discard changes
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
