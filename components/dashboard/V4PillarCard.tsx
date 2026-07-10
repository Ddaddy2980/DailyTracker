'use client'

import Image from 'next/image'
import Link from 'next/link'
import { PILLAR_CONFIG, LEVEL_NAMES, DEFAULT_GOAL_EMOJI, deriveGoalLabel } from '@/lib/constants'
import type { PillarName, LevelNumber, DurationGoal, DestinationGoal, GoalType } from '@/lib/types'
import { GoalRing } from './GoalRing'

// One card for every level. Header = pillar PNG icon / name / level / 7-day dots
// / 🔥 pillar streak. Body = a grid of press-and-hold GoalRings. Grooving+ adds a
// quiet destination-goal checklist below a divider (never affects streaks). The
// card ignites (`lit`) and shimmers on completion — states driven by the parent.

interface V4PillarCardProps {
  pillar:            PillarName
  level:             LevelNumber
  goals:             DurationGoal[]
  destinationGoals?: DestinationGoal[]
  completions:       Record<string, boolean>   // goalId → optimistic done
  inFlight:          Set<string>
  dots:              boolean[]                  // ≤7, chronological, last = today
  pillarStreak:      number
  lit?:              boolean
  shimmer?:          boolean
  onCommitGoal:      (goalId: string, goalType: GoalType, done: boolean) => void
}

export function V4PillarCard({
  pillar,
  level,
  goals,
  destinationGoals = [],
  completions,
  inFlight,
  dots,
  pillarStreak,
  lit = false,
  shimmer = false,
  onCommitGoal,
}: V4PillarCardProps) {
  const config = PILLAR_CONFIG[pillar]
  const fourUp = goals.length === 4

  return (
    <div
      className={`v4card relative overflow-hidden rounded-[18px] px-3.5 pb-3.5 pt-3 shadow-[0_2px_8px_rgba(15,23,42,0.10)] ${
        lit ? 'is-lit' : ''
      } ${shimmer ? 'is-shimmer' : ''}`}
      style={{ background: config.background }}
    >
      {/* header */}
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[9px] bg-white/15">
          <Image src={config.icon} alt="" width={20} height={20} />
        </span>
        <div className="flex min-w-0 flex-1 items-baseline gap-[7px]">
          <span className="text-[14.5px] font-semibold" style={{ color: config.title }}>
            {config.label}
          </span>
          <span
            className="text-[10.5px] uppercase tracking-[0.05em]"
            style={{ color: config.subtitle }}
          >
            {LEVEL_NAMES[level]}
          </span>
          {dots.length > 0 && (
            <span
              className="ml-0.5 flex gap-[3.5px]"
              role="img"
              aria-label={`Last ${dots.length} days: ${dots.filter(Boolean).length} completed`}
            >
              {dots.map((filled, i) => (
                <span
                  key={i}
                  className="block h-1.5 w-1.5 rounded-full"
                  style={
                    filled
                      ? { background: config.title }
                      : { background: 'transparent', border: `1.5px solid ${config.subtitle}` }
                  }
                />
              ))}
            </span>
          )}
        </div>
        {pillarStreak > 0 && (
          <span
            className="ml-auto flex items-center gap-[3px] text-[11px] font-semibold"
            style={{ color: config.title }}
          >
            🔥 {pillarStreak}
          </span>
        )}
      </div>

      {/* goal rings — or empty state */}
      {goals.length === 0 ? (
        <Link
          href="/goals"
          className="block rounded-xl bg-white/10 px-3 py-2.5 text-center text-[12px]"
          style={{ color: config.title }}
        >
          Add a goal →
        </Link>
      ) : (
        <div className="flex flex-wrap justify-around gap-x-1 gap-y-2.5">
          {goals.map((g) => {
            const label = g.label ?? deriveGoalLabel(g.goal_text)
            const icon = g.icon ?? DEFAULT_GOAL_EMOJI[pillar]
            return (
              <GoalRing
                key={g.id}
                label={label}
                icon={icon}
                labelColor={config.title}
                done={completions[g.id] === true}
                disabled={inFlight.has(g.id)}
                widthClass={fourUp ? 'w-[44%]' : 'w-24'}
                ariaLabel={`Press and hold to complete: ${g.goal_text}`}
                onHold={() => onCommitGoal(g.id, 'duration', true)}
              />
            )
          })}
        </div>
      )}

      {/* destination checklist (Grooving+) — quiet, never affects streaks */}
      {level >= 3 && destinationGoals.length > 0 && (
        <div className="mt-3 border-t border-white/15 pt-3">
          <p
            className="mb-1.5 text-[10px] uppercase tracking-[0.06em]"
            style={{ color: config.subtitle }}
          >
            Destination goals
          </p>
          <div className="flex flex-col gap-1">
            {destinationGoals.map((dg) => {
              const done = completions[dg.id] === true
              return (
                <button
                  key={dg.id}
                  type="button"
                  disabled={inFlight.has(dg.id)}
                  onClick={() => onCommitGoal(dg.id, 'destination', !done)}
                  className="flex w-full items-center gap-2 py-1 text-left disabled:opacity-60"
                  aria-pressed={done}
                >
                  <span
                    className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-md text-[11px] text-white"
                    style={
                      done
                        ? { background: '#22c55e' }
                        : { background: 'transparent', border: `1.5px solid ${config.subtitle}` }
                    }
                  >
                    {done ? '✓' : ''}
                  </span>
                  <span className="text-[12px]" style={{ color: config.title }}>
                    {dg.goal_text}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
