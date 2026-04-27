'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PILLAR_ORDER } from '@/lib/constants'
import type { PillarLevel, PillarName, LevelNumber } from '@/lib/types'
import PillarPortrait from '@/components/onboarding/PillarPortrait'
import GoalEditorCard from '@/components/goals/GoalEditorCard'

interface PillarState {
  goals:    string[]
  isActive: boolean
}

type PillarStateMap = Record<PillarName, PillarState>

function initState(): PillarStateMap {
  return {
    spiritual:   { goals: [], isActive: true },
    physical:    { goals: [], isActive: true },
    nutritional: { goals: [], isActive: true },
    personal:    { goals: [], isActive: true },
    relational:  { goals: [], isActive: true },
  }
}

interface OnboardingGoalsClientProps {
  pillarLevels: PillarLevel[]
  durationDays: number
}

export default function OnboardingGoalsClient({
  pillarLevels,
  durationDays,
}: OnboardingGoalsClientProps) {
  const router = useRouter()
  const [phase, setPhase]   = useState<'portrait' | 'setup'>('portrait')
  const [state, setState]   = useState<PillarStateMap>(initState)
  const [saving, setSaving] = useState(false)
  const [warnSolo, setWarnSolo] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const levelMap = Object.fromEntries(
    pillarLevels.map((pl) => [pl.pillar, pl.level as LevelNumber])
  ) as Record<PillarName, LevelNumber>

  function handleGoalsChange(pillar: PillarName, goals: string[]) {
    setWarnSolo(false)
    setState((prev) => ({ ...prev, [pillar]: { ...prev[pillar], goals } }))
  }

  function handleToggle(pillar: PillarName) {
    const current     = state[pillar].isActive
    const activeCount = PILLAR_ORDER.filter((p) => state[p].isActive).length

    if (current && activeCount <= 1) {
      setWarnSolo(true)
      return
    }

    setWarnSolo(false)
    setState((prev) => ({
      ...prev,
      [pillar]: { ...prev[pillar], isActive: !current },
    }))
  }

  const hasAtLeastOneValidGoal = PILLAR_ORDER.some(
    (p) => state[p].isActive && state[p].goals.length > 0
  )

  async function handleSubmit() {
    if (!hasAtLeastOneValidGoal || saving) return
    setSaving(true)
    setSubmitError(null)

    const goalsPayload = PILLAR_ORDER.flatMap((pillar) =>
      state[pillar].isActive
        ? state[pillar].goals.map((goal_text) => ({
            pillar,
            goal_text,
            activate: true,
          }))
        : [{ pillar, goal_text: '', activate: false }]
    )

    try {
      const res = await fetch('/api/onboarding/goals', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ goals: goalsPayload }),
      })

      if (!res.ok) {
        setSubmitError('Something went wrong saving your goals. Please try again.')
        return
      }

      router.push('/dashboard')
    } catch {
      setSubmitError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  if (phase === 'portrait') {
    return (
      <PillarPortrait
        pillarLevels={pillarLevels}
        onContinue={() => setPhase('setup')}
      />
    )
  }

  return (
    <div className="w-full max-w-lg mt-6">
      <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
        Set Your First Goals
      </h1>
      <p className="text-slate-500 text-center text-sm mb-6">
        Your {durationDays}-day challenge starts when you tap &ldquo;Start My Challenge.&rdquo; Set at
        least one goal for any pillar you want active — or leave a pillar dormant for now.
      </p>

      {PILLAR_ORDER.map((pillar) => (
        <GoalEditorCard
          key={pillar}
          context="onboarding"
          pillar={pillar}
          level={levelMap[pillar] ?? 1}
          goals={state[pillar].goals}
          isActive={state[pillar].isActive}
          onGoalsChange={(goals) => handleGoalsChange(pillar, goals)}
          onToggle={() => handleToggle(pillar)}
        />
      ))}

      {warnSolo && (
        <p className="text-amber-600 text-sm text-center mb-4">
          At least one pillar must be active to start your challenge.
        </p>
      )}

      {submitError && (
        <p className="text-red-600 text-sm text-center mb-4">{submitError}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!hasAtLeastOneValidGoal || saving}
        className={[
          'w-full py-3 rounded-xl font-semibold text-sm transition-colors mt-2',
          hasAtLeastOneValidGoal && !saving
            ? 'bg-slate-900 text-white hover:bg-slate-800'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed',
        ].join(' ')}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Starting…
          </span>
        ) : (
          'Start My Challenge →'
        )}
      </button>
    </div>
  )
}
