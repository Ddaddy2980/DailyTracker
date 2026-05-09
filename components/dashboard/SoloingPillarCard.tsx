'use client'

import { useState } from 'react'
import Image from 'next/image'
import { PILLAR_CONFIG, LEVEL_NAMES } from '@/lib/constants'
import type { PillarLevel, DurationGoal, DestinationGoal, PillarDailyEntry, GoalCompletions, PulseState } from '@/lib/types'
import ProgressRing from './ProgressRing'
import { usePillarSave } from '@/hooks/usePillarSave'
import ChevronIcon from '@/components/ui/ChevronIcon'

interface SoloingPillarCardProps {
  pillarLevel: PillarLevel
  goals: DurationGoal[]
  destinationGoals: DestinationGoal[]
  todayEntry: PillarDailyEntry | null
  challengeId: string
  entryDate: string
  pulseState: PulseState
}

export default function SoloingPillarCard({
  pillarLevel,
  goals,
  destinationGoals,
  todayEntry,
  challengeId,
  entryDate,
  // pulseState: Soloing has no video button — received but intentionally unused
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pulseState: _pulseState,
}: SoloingPillarCardProps) {
  const { pillar, level } = pillarLevel
  const config = PILLAR_CONFIG[pillar]

  const [isOpen, setIsOpen] = useState(false)
  const [completions, setCompletions] = useState<GoalCompletions>(() => {
    return todayEntry?.goal_completions ?? {}
  })
  const { saving, saved, saveError, handleSave } = usePillarSave(
    pillar, challengeId, entryDate, () => setIsOpen(false),
  )

  const checkedDurationCount = goals.filter((g) => completions[g.id] === true).length
  const pct = goals.length === 0 ? 0 : checkedDurationCount / goals.length

  function toggleGoal(goalId: string) {
    setCompletions((prev) => ({ ...prev, [goalId]: !prev[goalId] }))
  }

  const saveLabel = saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'

  return (
    <div className="rounded-xl overflow-hidden shadow-sm">
      {/* Collapsed header row — always visible */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 p-4"
        style={{ backgroundColor: config.background }}
        aria-expanded={isOpen}
      >
        <Image
          src={config.icon}
          alt={config.label}
          width={28}
          height={28}
          className="flex-shrink-0"
        />

        <div className="flex-1 text-left">
          <p className="font-semibold leading-tight" style={{ color: config.title }}>
            {config.label}
          </p>
          <p className="text-sm" style={{ color: config.subtitle }}>
            {LEVEL_NAMES[level]}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ProgressRing
            percentage={pct}
            titleColor={config.title}
            subtitleColor={config.subtitle}
          />
          <ChevronIcon className={`w-5 h-5 text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div
          className="px-4 pb-4 pt-0"
          style={{ backgroundColor: config.background }}
        >
          <div className="border-t mt-0 pt-3" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>

            {/* Identity framing */}
            <p className="text-xs italic mb-3" style={{ color: config.subtitle }}>
              You&apos;ve made this part of who you are.
            </p>

            {/* Duration goals */}
            {goals.length === 0 ? (
              <p className="text-sm italic mb-3" style={{ color: config.subtitle }}>
                No duration goals set yet.
              </p>
            ) : (
              <ul className="space-y-2 mb-3">
                {goals.map((goal) => (
                  <li key={goal.id} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`goal-${goal.id}`}
                      checked={completions[goal.id] ?? false}
                      onChange={() => toggleGoal(goal.id)}
                      className="mt-0.5 h-4 w-4 rounded border-2 border-white bg-transparent flex-shrink-0 cursor-pointer accent-white"
                    />
                    <label
                      htmlFor={`goal-${goal.id}`}
                      className="text-sm leading-snug cursor-pointer"
                      style={{ color: config.title }}
                    >
                      {goal.goal_text}
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {/* Destination goals */}
            <div
              className="border-t mb-3"
              style={{ borderColor: 'rgba(255,255,255,0.15)' }}
            />
            {destinationGoals.length === 0 ? (
              <p className="text-xs italic mb-3" style={{ color: config.subtitle }}>
                Destination goals can be added once you begin your journey.
              </p>
            ) : (
              <ul className="space-y-2 mb-3">
                {destinationGoals.map((goal) => (
                  <li key={goal.id} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`dest-${goal.id}`}
                      checked={completions[goal.id] ?? false}
                      onChange={() => toggleGoal(goal.id)}
                      className="mt-0.5 h-4 w-4 rounded border-2 border-white bg-transparent flex-shrink-0 cursor-pointer accent-white"
                    />
                    <label
                      htmlFor={`dest-${goal.id}`}
                      className="text-sm leading-snug cursor-pointer"
                      style={{ color: config.subtitle }}
                    >
                      {goal.goal_text}
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => handleSave(completions)}
              disabled={saving}
              className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-70"
              style={{ backgroundColor: config.saveButton }}
            >
              {saveLabel}
            </button>

            {saveError && (
              <p className="text-red-400 text-xs mt-2 text-center">{saveError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
