'use client'

import { useState, useTransition } from 'react'
import { createDestinationGoal } from '@/app/actions'
import type { DestinationGoal, FocusTop5Item } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const PILLAR_LABEL: Record<string, string> = {
  spiritual: 'Spiritual', physical: 'Physical',
  nutritional: 'Nutritional', personal: 'Personal',
}

const PILLAR_COLOR: Record<string, string> = {
  spiritual: 'text-purple-400', physical: 'text-emerald-400',
  nutritional: 'text-amber-400', personal: 'text-blue-400',
}

const PILLAR_RING: Record<string, string> = {
  spiritual: 'focus:ring-purple-500', physical: 'focus:ring-emerald-500',
  nutritional: 'focus:ring-amber-500', personal: 'focus:ring-blue-500',
}

const PILLAR_PLACEHOLDER: Record<string, string> = {
  spiritual:   'e.g. Someone who starts each day in prayer without needing a reminder',
  physical:    'e.g. Someone who moves their body as a natural part of every day',
  nutritional: 'e.g. Someone who sees food as fuel and consistently chooses accordingly',
  personal:    'e.g. Someone who reads daily without needing discipline to start',
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  pillars:        string[]
  challengeId:    string
  existingGoals?: DestinationGoal[]
  focusTop5?:     FocusTop5Item[] | null   // available after the 25/5 exercise
  onComplete:     () => void
}

export default function DestinationGoalSetup({
  pillars, challengeId, existingGoals = [], focusTop5, onComplete,
}: Props) {
  // Skip intro if goals already exist (editing flow)
  const [screen, setScreen] = useState<1 | 2>(existingGoals.length > 0 ? 2 : 1)

  // Pre-populate from existing active goals
  const [goals, setGoals] = useState<Record<string, string>>(
    Object.fromEntries(pillars.map(p => {
      const found = existingGoals.find(g => g.pillar === p && g.status === 'active')
      return [p, found?.goal_name ?? '']
    }))
  )
  const [dates, setDates] = useState<Record<string, string>>(
    Object.fromEntries(pillars.map(p => {
      const found = existingGoals.find(g => g.pillar === p && g.status === 'active')
      return [p, found?.target_date ?? '']
    }))
  )
  const [ranks, setRanks] = useState<Record<string, number | null>>(
    Object.fromEntries(pillars.map(p => {
      const found = existingGoals.find(g => g.pillar === p && g.status === 'active')
      return [p, found?.focus_item_rank ?? null]
    }))
  )
  const [isPending, startTransition] = useTransition()

  const atLeastOneGoal = pillars.some(p => goals[p].trim().length > 0)

  function handleSave() {
    if (!atLeastOneGoal) return
    startTransition(async () => {
      await Promise.all(
        pillars
          .filter(p => goals[p].trim().length > 0)
          .map(p => createDestinationGoal({
            challengeId,
            pillar:        p,
            goalName:      goals[p].trim(),
            targetDate:    dates[p] || null,
            focusItemRank: ranks[p] ?? null,
          }))
      )
      onComplete()
    })
  }

  // ── Screen 1: Intro ─────────────────────────────────────────────────────────

  if (screen === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/90 p-4">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-8 space-y-6 text-center">

          <div className="text-5xl">🌱</div>

          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-400">
              Rooted Milestone
            </p>
            <h2 className="text-2xl font-black text-white leading-tight">
              You&apos;ve built something real.
            </h2>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed">
            You&apos;ve been consistent for 40+ days with a goal you carried forward from before.
            That kind of momentum doesn&apos;t happen by accident.
          </p>

          <p className="text-slate-300 text-sm leading-relaxed">
            Now it&apos;s time to aim it at something. Where is all this consistency{' '}
            <em>going</em>? Set a destination — not a daily task, but a direction.
            The kind of person you&apos;re becoming.
          </p>

          <button
            onClick={() => setScreen(2)}
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-colors active:scale-95"
          >
            Set my direction →
          </button>

          <button
            onClick={onComplete}
            className="w-full text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Skip for now
          </button>

        </div>
      </div>
    )
  }

  // ── Screen 2: Per-pillar form ────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/90 p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden my-4">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-1">
            Destination Goals
          </p>
          <h2 className="text-xl font-black text-white">Where are you headed?</h2>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            Write a direction, not a task. &ldquo;Become someone who runs every week&rdquo; — not
            &ldquo;run a 5k.&rdquo; Fill in at least one pillar.
          </p>
        </div>

        {/* Per-pillar inputs */}
        <div className="divide-y divide-slate-800">
          {pillars.map(pillar => (
            <div key={pillar} className="px-6 py-5 space-y-3">
              <p className={`text-xs font-black uppercase tracking-widest ${PILLAR_COLOR[pillar] ?? 'text-slate-400'}`}>
                {PILLAR_LABEL[pillar] ?? pillar}
              </p>

              <textarea
                value={goals[pillar]}
                onChange={e => setGoals(prev => ({ ...prev, [pillar]: e.target.value }))}
                placeholder={PILLAR_PLACEHOLDER[pillar] ?? 'Where are you headed?'}
                rows={2}
                className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm
                  resize-none placeholder:text-slate-600 focus:outline-none focus:ring-2
                  ${PILLAR_RING[pillar] ?? 'focus:ring-violet-500'}`}
              />

              {/* Target date and focus rank — only shown when this pillar has a goal */}
              {goals[pillar].trim().length > 0 && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-500 font-medium">
                      Target date <span className="text-slate-600">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={dates[pillar]}
                      onChange={e => setDates(prev => ({ ...prev, [pillar]: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5
                        text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>

                  {/* Focus rank — shown when the user has completed the 25/5 exercise */}
                  {focusTop5 && focusTop5.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-500 font-medium">
                        Link to focus list <span className="text-slate-600">(optional)</span>
                      </label>
                      <select
                        value={ranks[pillar] ?? ''}
                        onChange={e => setRanks(prev => ({
                          ...prev,
                          [pillar]: e.target.value ? Number(e.target.value) : null,
                        }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5
                          text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="">No link</option>
                        {focusTop5.map(item => (
                          <option key={item.rank} value={item.rank}>
                            Focus {item.rank}: {item.text}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Nudge when exercise hasn't been done yet */}
                  {(!focusTop5 || focusTop5.length === 0) && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Complete the 25/5 exercise to link this goal to your focus list.
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 flex items-center gap-3 border-t border-slate-800">
          {existingGoals.length === 0 && (
            <button
              onClick={() => setScreen(1)}
              className="px-4 py-3 text-slate-400 hover:text-slate-200 text-sm font-bold transition-colors"
            >
              ← Back
            </button>
          )}
          {existingGoals.length > 0 && (
            <button
              onClick={onComplete}
              className="px-4 py-3 text-slate-400 hover:text-slate-200 text-sm font-bold transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isPending || !atLeastOneGoal}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-colors
              ${isPending || !atLeastOneGoal
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-600 text-white active:scale-95'
              }`}
          >
            {isPending ? 'Saving…' : 'Save direction'}
          </button>
        </div>

      </div>
    </div>
  )
}
