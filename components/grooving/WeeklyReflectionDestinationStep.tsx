'use client'

import { useState, useEffect } from 'react'
import { PILLAR_CONFIG } from '@/lib/constants'
import { daysUntil } from '@/lib/utils'
import type { DurationGoalDestination } from '@/lib/types'
import type { PillarStat } from './WeeklyReflectionSummaryStep'

// ── Types ─────────────────────────────────────────────────────────────────────

export type DestinationGoalResponse = 'on_track' | 'slowly' | 'not_this_week'

interface Props {
  activeDestinationGoals: DurationGoalDestination[]
  pillarStats:            PillarStat[]
  isPending:              boolean
  onContinue:             (responses: Record<string, DestinationGoalResponse>) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type PillarConfig = typeof PILLAR_CONFIG[keyof typeof PILLAR_CONFIG]
const FALLBACK_CONFIG: PillarConfig = PILLAR_CONFIG.spiritual

function getPillarConfig(pillar: string): PillarConfig {
  return (PILLAR_CONFIG as Record<string, PillarConfig>)[pillar] ?? FALLBACK_CONFIG
}

function coachingNote(
  pillarStats: PillarStat[],
  responses:   Record<string, DestinationGoalResponse>,
): string {
  const totalDays  = pillarStats.reduce((sum, p) => sum + p.thisWeek, 0)
  const avgDays    = pillarStats.length > 0 ? Math.round(totalDays / pillarStats.length) : 0
  const durationGood = avgDays >= 4

  const responseValues = Object.values(responses)
  const destinationGood =
    responseValues.length > 0 &&
    responseValues.filter(r => r === 'on_track').length > responseValues.length / 2

  if (durationGood && !destinationGood) {
    return `You showed up ${avgDays} of 7 days. That's what this is about. Your destination goal is still in front of you.`
  }
  if (!durationGood && destinationGood) {
    return `You're moving toward your goal — and your daily habit is what makes it stick. This week, let's focus on the daily practice first.`
  }
  return `Your destination goal is what this daily habit is building toward. Keep going.`
}

// ── Component ─────────────────────────────────────────────────────────────────

const RESPONSE_OPTIONS: { value: DestinationGoalResponse; label: string; icon: string }[] = [
  { value: 'on_track',      label: 'On track',      icon: '✅' },
  { value: 'slowly',        label: 'Slowly',         icon: '🐢' },
  { value: 'not_this_week', label: 'Not this week',  icon: '🔄' },
]

export default function WeeklyReflectionDestinationStep({
  activeDestinationGoals, pillarStats, isPending, onContinue,
}: Props) {
  // Guard: only show truly active goals — resolveExpiredDestinationGoals may have
  // updated the DB after the prop was fetched (fire-and-forget timing in Step 46).
  const visibleGoals = activeDestinationGoals.filter(g => g.status === 'active')

  const [responses, setResponses] = useState<Record<string, DestinationGoalResponse>>({})

  // Auto-skip this step if no active goals remain after the status guard.
  useEffect(() => {
    if (visibleGoals.length === 0) onContinue({})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allAnswered = visibleGoals.every(g => responses[g.id] !== undefined)

  function handleSelect(goalId: string, response: DestinationGoalResponse) {
    setResponses(prev => ({ ...prev, [goalId]: response }))
  }

  // Don't render anything while auto-skipping
  if (visibleGoals.length === 0) return null

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Destination Goals</p>
        <p className="text-white font-bold text-base">Your destination goals this week</p>
      </div>

      <div className="space-y-5">
        {visibleGoals.map(goal => {
          const cfg      = getPillarConfig(goal.pillar)
          const days     = daysUntil(goal.end_date)
          const endingSoon = days <= 7

          return (
            <div key={goal.id} className="space-y-2">
              <div>
                <p className="text-white text-sm font-semibold leading-snug">{goal.goal_name}</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {goal.frequency_target}× per week · {days} days remaining
                </p>
              </div>
              <div className="flex gap-2">
                {RESPONSE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(goal.id, opt.value)}
                    className={`flex-1 rounded-xl border py-2 px-1 text-center transition-all ${
                      responses[goal.id] === opt.value
                        ? 'bg-violet-900 border-violet-500 ring-1 ring-violet-500'
                        : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <span className="block text-base">{opt.icon}</span>
                    <span className={`block text-[10px] font-semibold mt-0.5 ${
                      responses[goal.id] === opt.value ? 'text-violet-200' : 'text-slate-400'
                    }`}>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Expiry notice — shown when goal ends within 7 days */}
              {endingSoon && (
                <div
                  className="rounded-md px-3 py-2 mt-2"
                  style={{ backgroundColor: cfg.subtitle + '26' }}
                >
                  <p className="text-xs leading-snug" style={{ color: cfg.subtitle }}>
                    This goal is wrapping up in {Math.max(1, days)} {days === 1 ? 'day' : 'days'}.
                  </p>
                  <p className="text-xs leading-snug mt-0.5" style={{ color: cfg.subtitle }}>
                    How do you want to finish?
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Coaching note — always shown */}
      <p className="text-slate-400 text-xs leading-relaxed italic">
        {coachingNote(pillarStats, responses)}
      </p>

      <button
        onClick={() => onContinue(responses)}
        disabled={!allAnswered || isPending}
        className="w-full py-3 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-white transition-colors"
      >
        {isPending ? 'Saving…' : 'Continue →'}
      </button>
    </div>
  )
}
