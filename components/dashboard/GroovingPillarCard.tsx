'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PILLAR_CONFIG, LEVEL_NAMES } from '@/lib/constants'
import type { PillarLevel, DurationGoal, DestinationGoal, PillarDailyEntry, GoalCompletions, LevelNumber } from '@/lib/types'

interface CheckinApiResponse {
  success: boolean
  completed: boolean
  advanced: boolean
  newLevel: LevelNumber | null
}

interface GroovingPillarCardProps {
  pillarLevel: PillarLevel
  goals: DurationGoal[]
  destinationGoals: DestinationGoal[]
  todayEntry: PillarDailyEntry | null
  challengeId: string
  userId: string
  entryDate: string
}

const CIRCUMFERENCE = 2 * Math.PI * 15  // r=15 → ≈ 94.25

interface ProgressRingProps {
  pct: number
  titleColor: string
  subtitleColor: string
}

function ProgressRing({ pct, titleColor, subtitleColor }: ProgressRingProps) {
  const offset = CIRCUMFERENCE * (1 - pct)
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      className="-rotate-90 flex-shrink-0"
      aria-hidden="true"
    >
      {/* track */}
      <circle
        cx="18"
        cy="18"
        r="15"
        fill="none"
        stroke={subtitleColor}
        strokeOpacity={0.3}
        strokeWidth="3"
      />
      {/* progress */}
      <circle
        cx="18"
        cy="18"
        r="15"
        fill="none"
        stroke={titleColor}
        strokeWidth="3"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
    </svg>
  )
}

export default function GroovingPillarCard({
  pillarLevel,
  goals,
  destinationGoals,
  todayEntry,
  challengeId,
  entryDate,
}: GroovingPillarCardProps) {
  const { pillar, level } = pillarLevel
  const config = PILLAR_CONFIG[pillar]
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [completions, setCompletions] = useState<GoalCompletions>(() => {
    return todayEntry?.goal_completions ?? {}
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [advancedToLevel, setAdvancedToLevel] = useState<LevelNumber | null>(null)

  const checkedDurationCount = goals.filter((g) => completions[g.id] === true).length
  const pct = goals.length === 0 ? 0 : checkedDurationCount / goals.length

  function toggleGoal(goalId: string) {
    setCompletions((prev) => ({ ...prev, [goalId]: !prev[goalId] }))
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pillar,
        challengeId,
        goalCompletions: completions,
        entry_date: entryDate,
      }),
    })
    const data = (await res.json()) as CheckinApiResponse
    setSaving(false)

    if (data.advanced && data.newLevel) {
      setAdvancedToLevel(data.newLevel)
      setTimeout(() => router.refresh(), 2500)
    } else {
      setSaved(true)
      setIsOpen(false)
      setTimeout(() => setSaved(false), 2000)
    }
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
            pct={pct}
            titleColor={config.title}
            subtitleColor={config.subtitle}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="white"
            className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div
          className="px-4 pb-4 pt-0"
          style={{ backgroundColor: config.background }}
        >
          <div className="border-t mt-0 pt-3" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>

            {/* Advancement toast — replaces content when level-up fires */}
            {advancedToLevel !== null ? (
              <div className="py-4 text-center">
                <p className="font-semibold mb-1" style={{ color: config.title }}>
                  You&apos;ve advanced to {LEVEL_NAMES[advancedToLevel]}!
                </p>
                <p className="text-sm" style={{ color: config.subtitle }}>
                  Your dashboard is updating…
                </p>
              </div>
            ) : (
            <>
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
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-70"
              style={{ backgroundColor: config.saveButton }}
            >
              {saveLabel}
            </button>
            </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
