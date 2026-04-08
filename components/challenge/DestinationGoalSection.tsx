'use client'

import { useState, useTransition } from 'react'
import { addDurationGoalDestination, releaseDurationGoalDestination } from '@/app/actions'
import type { DurationGoalDestination } from '@/lib/types'
import { todayStr } from '@/lib/constants'
import AddDestinationGoalForm from './AddDestinationGoalForm'
import type { AddFormState } from './AddDestinationGoalForm'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  pillar:               string
  challengeId:          string
  pillarLevel:          number
  activeGoals:          DurationGoalDestination[]
  subtitleColor:        string
  onChanged:            () => void
  videoG6bTriggered?:   boolean    // true = G6b already shown; never fire again
  onG6bTrigger?:        () => void  // called once after the very first goal save
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Cap applies to Grooving (level 3) only. Soloing and above (level >= 4) are uncapped by design.
const GROOVING_LIMIT    = 3
// Window ceiling: Grooving and below cap at 66 days; Soloing and above allow up to 100 days.
const GROOVING_MAX_WINDOW = 66
const SOLOING_MAX_WINDOW  = 100

const BLANK_FORM: AddFormState = { goalName: '', frequencyTarget: 3, windowDays: 30 }

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

function daysRemaining(endDate: string): number {
  const today = new Date(todayStr() + 'T00:00:00')
  const end   = new Date(endDate + 'T00:00:00')
  return Math.max(0, Math.round((end.getTime() - today.getTime()) / 86400000))
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DestinationGoalSection({
  pillar, challengeId, pillarLevel, activeGoals, subtitleColor, onChanged,
  videoG6bTriggered = true, onG6bTrigger,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const [goals, setGoals]           = useState<DurationGoalDestination[]>(activeGoals)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState<AddFormState>(BLANK_FORM)
  const [formError, setFormError]   = useState<string | null>(null)
  const [confirmId, setConfirmId]   = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const atLimit      = pillarLevel === 3 && goals.length >= GROOVING_LIMIT
  const maxWindowDays = pillarLevel >= 4 ? SOLOING_MAX_WINDOW : GROOVING_MAX_WINDOW
  const canAdd       = !atLimit && !showForm

  function handleAddClick() {
    setForm(BLANK_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function handleConfirm() {
    if (!form.goalName.trim()) { setFormError('Please enter a goal name.'); return }
    const today   = todayStr()
    const endDate = addDays(today, form.windowDays)
    startTransition(async () => {
      const result = await addDurationGoalDestination({
        challengeId,
        pillar,
        goalName:        form.goalName.trim(),
        frequencyTarget: form.frequencyTarget,
        windowDays:      form.windowDays,
        startDate:       today,
        endDate,
      })
      if (!result.success) { setFormError(result.error ?? 'Failed to save.'); return }

      // Fire the G6b video trigger the first time a destination goal is ever added.
      // goals.length === 0 means this is the first goal for this pillar/session;
      // videoG6bTriggered guards against re-triggering across pillars or sessions.
      if (!videoG6bTriggered && goals.length === 0) {
        onG6bTrigger?.()
      }

      const newGoal: DurationGoalDestination = {
        id:               crypto.randomUUID(),
        user_id:          '',
        challenge_id:     challengeId,
        pillar,
        goal_name:        form.goalName.trim(),
        frequency_target: form.frequencyTarget,
        frequency_unit:   'weekly',
        window_days:      form.windowDays,
        start_date:       today,
        end_date:         endDate,
        status:           'active',
        created_at:       new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      }
      setGoals(prev => [...prev, newGoal])
      setShowForm(false)
      setForm(BLANK_FORM)
      setSuccessMsg(`Your habit continues every day. This goal gives it a direction for the next ${form.windowDays} days.`)
      setTimeout(() => setSuccessMsg(null), 5000)
      onChanged()
    })
  }

  function handleRelease(goalId: string) {
    startTransition(async () => {
      const result = await releaseDurationGoalDestination(goalId)
      if (!result.success) return
      setGoals(prev => prev.filter(g => g.id !== goalId))
      setConfirmId(null)
      onChanged()
    })
  }

  return (
    <div className="mt-4 pt-3 border-t border-white/20 space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: subtitleColor }}>
        Direction
      </p>

      {/* Active goal list */}
      {goals.map(g => (
        <div key={g.id} className="space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-white leading-snug">{g.goal_name}</p>
              <p className="text-xs text-white/60">
                {g.frequency_target}× per week · {daysRemaining(g.end_date)} days remaining
              </p>
            </div>
            {confirmId === g.id ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleRelease(g.id)}
                  disabled={isPending}
                  className="text-xs text-white/70 underline hover:text-white transition-colors disabled:opacity-40"
                >
                  Yes, release
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  className="text-xs text-white/50 hover:text-white transition-colors"
                >
                  Keep it
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmId(g.id)}
                className="text-xs text-white/50 underline hover:text-white/80 transition-colors shrink-0"
              >
                Release
              </button>
            )}
          </div>
          {confirmId === g.id && (
            <p className="text-xs text-white/50 italic">Release this direction? Your daily habit continues.</p>
          )}
        </div>
      ))}

      {successMsg && (
        <p className="text-xs text-emerald-300 font-medium leading-snug">{successMsg}</p>
      )}

      {/* Add form or Add link */}
      {showForm ? (
        <AddDestinationGoalForm
          form={form}
          error={formError}
          isPending={isPending}
          maxWindowDays={maxWindowDays}
          onChange={setForm}
          onConfirm={handleConfirm}
          onCancel={() => { setShowForm(false); setFormError(null) }}
        />
      ) : (
        canAdd && (
          <button
            onClick={handleAddClick}
            className="text-sm text-white/60 hover:text-white/90 transition-colors"
          >
            {goals.length === 0 ? '+ Add a destination goal' : '+ Add another'}
          </button>
        )
      )}
    </div>
  )
}
