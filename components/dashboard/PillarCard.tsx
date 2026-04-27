'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PILLAR_CONFIG, LEVEL_NAMES } from '@/lib/constants'
import type { PillarLevel, DurationGoal, PillarDailyEntry, GoalCompletions } from '@/lib/types'

interface PillarCardProps {
  pillarLevel: PillarLevel
  goals: DurationGoal[]
  todayEntry: PillarDailyEntry | null
  challengeId: string
  userId: string
  entryDate: string
}

export default function PillarCard({
  pillarLevel,
  goals,
  todayEntry,
  challengeId,
  entryDate,
}: PillarCardProps) {
  const { pillar, level } = pillarLevel
  const config = PILLAR_CONFIG[pillar]

  const [isOpen, setIsOpen] = useState(false)
  const [completions, setCompletions] = useState<GoalCompletions>(() => {
    return todayEntry?.goal_completions ?? {}
  })
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const isCompletedToday =
    goals.length > 0 && goals.every((g) => completions[g.id] === true)

  function toggleGoal(goalId: string) {
    setCompletions((prev) => ({ ...prev, [goalId]: !prev[goalId] }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
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
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string }
        setSaveError(errData.error ?? 'Save failed. Please try again.')
        return
      }
      setSaved(true)
      setIsOpen(false)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaveError('Could not reach the server. Please try again.')
    } finally {
      setSaving(false)
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
          {isCompletedToday && (
            <span className="text-emerald-400 text-lg leading-none">✓</span>
          )}
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

            <button
              type="button"
              onClick={handleSave}
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
