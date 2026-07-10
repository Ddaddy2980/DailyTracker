'use client'

import { useState } from 'react'
import { PILLAR_CONFIG, DURATION_GOAL_CAP, destinationGoalsAvailable, deriveGoalLabel, DEFAULT_GOAL_EMOJI } from '@/lib/constants'
import type { PillarName, LevelNumber, DurationGoal, DestinationGoal, GoalDraft } from '@/lib/types'
import GoalInputRow from '@/components/goals/GoalInputRow'
import DestinationGoalSection from '@/components/goals/DestinationGoalSection'
import GoalList from '@/components/goals/GoalList'
import GoalEditorHeader from '@/components/goals/GoalEditorHeader'

// ── Shared props ──────────────────────────────────────────────────────────────

interface BaseProps {
  pillar: PillarName
  level:  LevelNumber
}

// ── Onboarding mode ───────────────────────────────────────────────────────────
// Local state only. Parent batches all goals and saves on submit.

interface OnboardingProps extends BaseProps {
  context:       'onboarding'
  goals:         GoalDraft[]        // current goal drafts (text + label + icon) for this pillar
  isActive:      boolean
  onGoalsChange: (goals: GoalDraft[]) => void
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

  // Uniform display shape (text + label + icon) for both modes. Mid-challenge
  // rows may predate v4, so fall back to a derived label and default icon.
  const displayGoals: GoalDraft[] =
    props.context === 'onboarding'
      ? props.goals
      : midGoals.map((g) => ({
          text:  g.goal_text,
          label: g.label ?? deriveGoalLabel(g.goal_text),
          icon:  g.icon ?? DEFAULT_GOAL_EMOJI[pillar],
        }))

  const atCap = displayGoals.length >= cap

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleAdd(draft: GoalDraft) {
    setError(null)

    if (props.context === 'onboarding') {
      props.onGoalsChange([...props.goals, draft])
      setAdding(false)
      return
    }

    // Mid-challenge: call API
    setSaving(true)
    try {
      const res = await fetch('/api/goals/duration', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pillar, goal_text: draft.text, label: draft.label, icon: draft.icon }),
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
      <GoalEditorHeader
        pillar={pillar}
        level={level}
        showToggle={props.context === 'onboarding'}
        isActive={props.context === 'onboarding' ? props.isActive : false}
        onToggle={props.context === 'onboarding' ? props.onToggle : undefined}
      />

      {/* ── Body — only shown when active ── */}
      {isActive && (
        <div className="px-4 pb-4">
          {/* Goal list */}
          <GoalList goals={displayGoals} saving={saving} onRemove={handleRemove} />

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
