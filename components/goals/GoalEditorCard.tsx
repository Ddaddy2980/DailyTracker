'use client'

import { useState } from 'react'
import Image from 'next/image'
import { PILLAR_CONFIG, LEVEL_NAMES, DURATION_GOAL_CAP, destinationGoalsAvailable } from '@/lib/constants'
import type { PillarName, LevelNumber, DurationGoal, DestinationGoal } from '@/lib/types'
import GoalInputRow from '@/components/goals/GoalInputRow'
import DestinationGoalSection from '@/components/goals/DestinationGoalSection'

// ── Shared props ──────────────────────────────────────────────────────────────

interface BaseProps {
  pillar: PillarName
  level:  LevelNumber
}

// ── Onboarding mode ───────────────────────────────────────────────────────────
// Local state only. Parent batches all goals and saves on submit.

interface OnboardingProps extends BaseProps {
  context:       'onboarding'
  goals:         string[]           // current goal texts for this pillar
  isActive:      boolean
  onGoalsChange: (goals: string[]) => void
  onToggle:      () => void
}

// ── Mid-challenge mode ────────────────────────────────────────────────────────
// Calls API directly on each add/remove.

interface MidChallengeProps extends BaseProps {
  context:             'mid-challenge'
  initialGoals:        DurationGoal[]
  initialDestinationGoals?: DestinationGoal[]
}

type GoalEditorCardProps = OnboardingProps | MidChallengeProps

// ── Component ─────────────────────────────────────────────────────────────────

export default function GoalEditorCard(props: GoalEditorCardProps) {
  const { pillar, level } = props
  const config = PILLAR_CONFIG[pillar]
  const cap    = DURATION_GOAL_CAP[level]

  // Mid-challenge: local mirror of goal rows (add/remove calls API then updates)
  const [midGoals, setMidGoals] = useState<DurationGoal[]>(
    props.context === 'mid-challenge' ? props.initialGoals : []
  )
  const [adding, setAdding]   = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Derived goal texts for display
  const displayGoals: string[] =
    props.context === 'onboarding'
      ? props.goals
      : midGoals.map((g) => g.goal_text)

  const atCap = displayGoals.length >= cap

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleAdd(text: string) {
    setError(null)

    if (props.context === 'onboarding') {
      props.onGoalsChange([...props.goals, text])
      setAdding(false)
      return
    }

    // Mid-challenge: call API
    setSaving(true)
    try {
      const res = await fetch('/api/goals/duration', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pillar, goal_text: text }),
      })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        setError(json.error ?? 'Failed to save goal.')
        return
      }
      const { goal } = (await res.json()) as { goal: DurationGoal }
      setMidGoals((prev) => [...prev, goal])
      setAdding(false)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(index: number) {
    setError(null)

    if (props.context === 'onboarding') {
      props.onGoalsChange(props.goals.filter((_, i) => i !== index))
      return
    }

    // Mid-challenge: call API
    const goal = midGoals[index]
    setSaving(true)
    try {
      const res = await fetch(`/api/goals/duration?id=${goal.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        setError(json.error ?? 'Failed to remove goal.')
        return
      }
      setMidGoals((prev) => prev.filter((_, i) => i !== index))
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const isActive =
    props.context === 'onboarding' ? props.isActive : midGoals.length > 0

  return (
    <div
      className="rounded-xl overflow-hidden mb-3"
      style={{ backgroundColor: config.background }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
          <Image
            src={config.icon}
            alt={config.label}
            width={32}
            height={32}
            className="object-contain"
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">{config.label}</p>
          <p className="text-xs" style={{ color: config.subtitle }}>
            {LEVEL_NAMES[level]}
          </p>
        </div>

        {/* Active/dormant toggle — onboarding only */}
        {props.context === 'onboarding' && (
          <button
            type="button"
            onClick={props.onToggle}
            className={[
              'shrink-0 text-xs font-semibold px-3 py-1 rounded-full border transition-colors',
              props.isActive
                ? 'bg-white text-slate-800 border-white'
                : 'bg-transparent text-white border-white/40 hover:border-white/70',
            ].join(' ')}
          >
            {props.isActive ? 'Active' : 'Leave dormant'}
          </button>
        )}
      </div>

      {/* ── Body — only shown when active ── */}
      {isActive && (
        <div className="px-4 pb-4">
          {/* Goal list */}
          {displayGoals.length > 0 && (
            <ul className="space-y-2 mb-2">
              {displayGoals.map((text, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 bg-white/10 rounded-lg px-3 py-2"
                >
                  <span className="flex-1 text-sm text-white leading-snug">{text}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(i)}
                    disabled={saving}
                    className="shrink-0 text-white/40 hover:text-white/80 transition-colors mt-0.5"
                    aria-label="Remove goal"
                  >
                    <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="1" y1="1" x2="13" y2="13" />
                      <line x1="13" y1="1" x2="1" y2="13" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add goal button or input row */}
          {!adding && !atCap && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="w-full py-2 rounded-lg text-xs font-semibold text-white/70 hover:text-white border border-white/20 hover:border-white/40 transition-colors"
            >
              + Add Goal
            </button>
          )}

          {!adding && atCap && (
            <p className="text-xs text-white/50 text-center py-1">
              Goal cap reached for this level ({cap} goal{cap !== 1 ? 's' : ''} max).
            </p>
          )}

          {adding && (
            <GoalInputRow
              pillar={pillar}
              onAdd={handleAdd}
              onCancel={() => setAdding(false)}
            />
          )}

          {error && (
            <p className="text-xs text-red-300 mt-2">{error}</p>
          )}

          {/* Destination goals — mid-challenge, Grooving+ only */}
          {props.context === 'mid-challenge' && destinationGoalsAvailable(level) && (
            <DestinationGoalSection
              pillar={pillar}
              level={level}
              initialGoals={props.initialDestinationGoals ?? []}
            />
          )}
        </div>
      )}
    </div>
  )
}
