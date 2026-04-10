'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PILLAR_ORDER } from '@/lib/constants'
import type { PillarLevel, PillarName, LevelNumber } from '@/lib/types'
import PillarPortrait from '@/components/onboarding/PillarPortrait'
import GoalSetupCard from '@/components/onboarding/GoalSetupCard'

interface GoalState {
  text:   string
  active: boolean
}

type GoalMap = Record<PillarName, GoalState>

interface GoalsFlowProps {
  pillarLevels: PillarLevel[]
  durationDays: number
}

function initGoals(): GoalMap {
  return {
    spiritual:   { text: '', active: true },
    physical:    { text: '', active: true },
    nutritional: { text: '', active: true },
    personal:    { text: '', active: true },
    relational:  { text: '', active: true },
  }
}

export default function GoalsFlow({ pillarLevels, durationDays }: GoalsFlowProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<'portrait' | 'setup'>('portrait')
  const [goals, setGoals] = useState<GoalMap>(initGoals)
  const [saving, setSaving] = useState(false)
  const [warnSolo, setWarnSolo] = useState(false)

  const levelMap = Object.fromEntries(
    pillarLevels.map((pl) => [pl.pillar, pl.level as LevelNumber])
  ) as Record<PillarName, LevelNumber>

  function handleGoalChange(pillar: PillarName, text: string) {
    setGoals((prev) => ({ ...prev, [pillar]: { ...prev[pillar], text } }))
    setWarnSolo(false)
  }

  function handleToggle(pillar: PillarName) {
    const current = goals[pillar].active
    const activeCount = PILLAR_ORDER.filter((p) => goals[p].active).length

    if (current && activeCount <= 1) {
      // Would leave zero active — warn instead of toggling
      setWarnSolo(true)
      return
    }

    setWarnSolo(false)
    setGoals((prev) => ({
      ...prev,
      [pillar]: { ...prev[pillar], active: !current },
    }))
  }

  const hasAtLeastOneValidGoal = PILLAR_ORDER.some(
    (p) => goals[p].active && goals[p].text.trim().length > 0
  )

  async function handleSubmit() {
    if (!hasAtLeastOneValidGoal || saving) return
    setSaving(true)

    const goalsPayload = PILLAR_ORDER.map((pillar) => ({
      pillar,
      goal_text: goals[pillar].text.trim(),
      activate:  goals[pillar].active && goals[pillar].text.trim().length > 0,
    }))

    const res = await fetch('/api/onboarding/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goals: goalsPayload }),
    })

    if (!res.ok) {
      setSaving(false)
      return
    }

    router.push('/dashboard')
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
        Your {durationDays}-day challenge starts when you tap &ldquo;Start.&rdquo; Set a goal for each
        pillar you want active — or leave any pillar dormant for now.
      </p>

      {PILLAR_ORDER.map((pillar) => (
        <GoalSetupCard
          key={pillar}
          pillar={pillar}
          level={levelMap[pillar] ?? 1}
          goalText={goals[pillar].text}
          isActive={goals[pillar].active}
          onChange={(text) => handleGoalChange(pillar, text)}
          onToggle={() => handleToggle(pillar)}
        />
      ))}

      {warnSolo && (
        <p className="text-amber-600 text-sm text-center mb-4">
          At least one pillar must be active to start your challenge.
        </p>
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
