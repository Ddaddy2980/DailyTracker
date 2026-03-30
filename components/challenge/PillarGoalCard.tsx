'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { submitCheckin } from '@/app/actions'
import type { PillarName } from '@/lib/types'

// ── Pillar UI config ──────────────────────────────────────────────────────────

const PILLAR_UI: Record<PillarName, { label: string; icon: string; accentVar: string }> = {
  spiritual:   { label: 'Spiritual',   icon: '/Spiritual_Icon_Bk.png',   accentVar: '--pillar-spiritual-accent'   },
  physical:    { label: 'Physical',    icon: '/Physical_Icon_Bk.png',    accentVar: '--pillar-physical-accent'    },
  nutritional: { label: 'Nutritional', icon: '/Nutritional_Icon_Bk.png', accentVar: '--pillar-nutritional-accent' },
  personal:    { label: 'Personal',    icon: '/Personal_Icon_Bk.png',    accentVar: '--pillar-personal-accent'    },
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  pillar:           string
  goals:            string[]
  savedCompletions: Record<string, boolean>   // full parent completions — all pillars
  challengeId:      string
  startDate:        string
  endDate:          string
  date:             string
  dayNumber:        number
  durationDays:     number
  level:            number
  onSaved:          (delta: Record<string, boolean>) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PillarGoalCard({
  pillar, goals, savedCompletions, challengeId, startDate, endDate,
  date, dayNumber, durationDays, level, onSaved,
}: Props) {
  const ui        = PILLAR_UI[pillar as PillarName] ?? { label: pillar, icon: '', accentVar: '--pillar-spiritual-accent' }
  const initDone  = savedCompletions[pillar] ?? false

  const [isExpanded,    setIsExpanded]    = useState(false)
  const [goalStates,    setGoalStates]    = useState<boolean[]>(() => goals.map(() => initDone))
  const [lastSavedDone, setLastSavedDone] = useState(initDone)
  const [showConfirm,   setShowConfirm]   = useState(false)
  const [isPending,     startTransition]  = useTransition()

  const doneCount  = goalStates.filter(Boolean).length
  const anyChecked = doneCount > 0
  const hasChanges = goalStates.some(g => g !== lastSavedDone)

  // ── Handlers ────────────────────────────────────────────────────────────────

  function toggleGoal(i: number) {
    if (lastSavedDone) return            // locked once saved
    setGoalStates(prev => prev.map((v, idx) => idx === i ? !v : v))
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
      await submitCheckin({
        date, challengeId, startDate, endDate,
        completions: { ...savedCompletions, [pillar]: anyChecked },
        dayNumber, durationDays, level,
      })
      setLastSavedDone(anyChecked)
      setGoalStates(goals.map(() => anyChecked))
      setShowConfirm(false)
      onSaved({ [pillar]: anyChecked })
      if (collapse) setIsExpanded(false)
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={`rounded-2xl overflow-hidden pillar-${pillar}`}>

      {/* Collapsed header — always visible */}
      <button
        onClick={handleHeaderTap}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {ui.icon && (
          <Image
            src={ui.icon}
            width={22}
            height={22}
            alt={ui.label}
            className="invert shrink-0"
          />
        )}
        <p className="flex-1 text-[11px] font-bold uppercase tracking-wider text-white">
          {ui.label}
        </p>
        <span className="text-xs font-semibold text-white/80 shrink-0">
          {doneCount}/{goals.length}
        </span>
        <svg
          className={`w-4 h-4 text-white/60 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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

          {/* Goal rows */}
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

          {/* Save button — hidden once this pillar is saved */}
          {!lastSavedDone && (
            <button
              onClick={() => performSave(true)}
              disabled={isPending || !anyChecked}
              className="w-full mt-1 py-2.5 rounded-xl font-bold text-sm text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: `var(${ui.accentVar})` }}
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
