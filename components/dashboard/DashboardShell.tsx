'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  PILLAR_ORDER,
  PILLAR_CONFIG,
  todayStr,
  MAX_PAUSE_DAYS,
  rollingWindowDates,
  getDayNumber,
} from '@/lib/constants'
import type {
  Challenge,
  PillarLevel,
  DurationGoal,
  DestinationGoal,
  PillarDailyEntry,
  PulseState,
  PillarName,
  GoalType,
  LevelNumber,
} from '@/lib/types'
import { useGoalCommit } from '@/hooks/useGoalCommit'
import { selectGreeting, selectPillarCompleteLine, selectPerfectDayLine } from '@/lib/tempo'
import type { HeroRingSegment } from './HeroRing'
import { HeroCard } from './HeroCard'
import { DayStrip } from './DayStrip'
import { V4PillarCard } from './V4PillarCard'
import { WhisperRow } from './WhisperRow'
import PausedDashboard from './PausedDashboard'
import LifePauseBanner from './LifePauseBanner'
import CompletionCountdownBanner from './CompletionCountdownBanner'
import AdvancementCelebrationModal from './AdvancementCelebrationModal'

interface DashboardShellProps {
  challenge: Challenge
  pillarLevels: PillarLevel[]
  durationGoals: DurationGoal[]
  destinationGoals: DestinationGoal[]
  windowEntries: PillarDailyEntry[]
  currentDay: number
  effectiveDay: number
  daysRemaining: number
  viewingDate: string
  userId: string
  isPaused: boolean
  pulseState: PulseState
  username: string | null
  // v4 streak props — always passed by the page; the through-yesterday values
  // seed the live display, then each commit response overwrites them.
  streak?: { mainStreak: number; graceBank: number; longestMainStreak: number }
  pillarStreaks?: Record<PillarName, number>
  morning?: { graceCoveredYesterday: boolean; comeback: boolean }
}

type Atmosphere = 'dawn' | 'day' | 'evening'

function atmosphereForHour(hour: number): Atmosphere {
  if (hour >= 4 && hour < 12) return 'dawn'
  if (hour >= 12 && hour < 18) return 'day'
  return 'evening'
}

export default function DashboardShell({
  challenge,
  pillarLevels,
  durationGoals,
  destinationGoals,
  windowEntries,
  effectiveDay,
  daysRemaining,
  viewingDate,
  isPaused,
  pulseState,
  username,
  streak,
  pillarStreaks,
  morning,
}: DashboardShellProps) {
  const today = todayStr()
  const isToday = viewingDate === today

  // ── Server data, indexed for O(1) per-pillar / per-date lookups ────────────
  const goalsByPillar = useMemo(() => {
    const map = new Map<PillarName, DurationGoal[]>()
    for (const g of durationGoals) {
      const arr = map.get(g.pillar) ?? []
      arr.push(g)
      map.set(g.pillar, arr)
    }
    return map
  }, [durationGoals])

  const destGoalsByPillar = useMemo(() => {
    const map = new Map<PillarName, DestinationGoal[]>()
    for (const g of destinationGoals) {
      const arr = map.get(g.pillar) ?? []
      arr.push(g)
      map.set(g.pillar, arr)
    }
    return map
  }, [destinationGoals])

  const entryByPillarDate = useMemo(() => {
    const map = new Map<string, PillarDailyEntry>()
    for (const e of windowEntries) map.set(`${e.pillar}|${e.entry_date}`, e)
    return map
  }, [windowEntries])

  // Active pillars in canonical order; "required" = active + at least one goal.
  const activeByPillar = useMemo(() => {
    const map = new Map<PillarName, PillarLevel>()
    for (const p of pillarLevels) if (p.is_active) map.set(p.pillar, p)
    return map
  }, [pillarLevels])

  const activePillarNames = PILLAR_ORDER.filter((p) => activeByPillar.has(p))
  const requiredPillarNames = activePillarNames.filter(
    (p) => (goalsByPillar.get(p)?.length ?? 0) > 0
  )

  // ── One-time seed of all live client state from the server props. The page
  //    remounts this shell (key={viewingDate}) on day navigation, so this
  //    initializer re-runs with the newly-viewed day's data. ─────────────────
  const [seed] = useState(() => {
    const comps: Record<string, boolean> = {}
    for (const e of windowEntries) {
      if (e.entry_date !== viewingDate) continue
      for (const [gid, v] of Object.entries(e.goal_completions ?? {})) {
        if (typeof v === 'boolean') comps[gid] = v
      }
    }
    const litFromSeed = (pillar: PillarName): boolean => {
      const gs = goalsByPillar.get(pillar) ?? []
      return gs.length > 0 && gs.every((g) => comps[g.id] === true)
    }
    const sealedSeed =
      isToday && requiredPillarNames.length > 0 && requiredPillarNames.every(litFromSeed)
    const pStreaks: Record<string, number> = {}
    for (const p of activePillarNames) {
      pStreaks[p] = (pillarStreaks?.[p] ?? 0) + (isToday && litFromSeed(p) ? 1 : 0)
    }
    return {
      comps,
      sealed: sealedSeed,
      pStreaks,
      mainSeed: (streak?.mainStreak ?? 0) + (sealedSeed ? 1 : 0),
      graceSeed: streak?.graceBank ?? 0,
    }
  })

  const [completions, setCompletions] = useState<Record<string, boolean>>(seed.comps)
  const [sealed, setSealed] = useState<boolean>(seed.sealed)
  const [mainStreak, setMainStreak] = useState<number>(seed.mainSeed)
  const [graceBank, setGraceBank] = useState<number>(seed.graceSeed)
  const [pillarStreakMap, setPillarStreakMap] = useState<Record<string, number>>(seed.pStreaks)

  const [shimmerPillars, setShimmerPillars] = useState<Set<PillarName>>(new Set())
  const [tempoLine, setTempoLine] = useState<string | null>(null)
  const [advancedPillar, setAdvancedPillar] = useState<PillarName | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Atmosphere gradient by the viewer's local hour (client-only to avoid a
  // UTC/local hydration mismatch).
  const [atmosphere, setAtmosphere] = useState<Atmosphere>('day')
  useEffect(() => {
    setAtmosphere(atmosphereForHour(new Date().getHours()))
  }, [])

  // Unprompted load greeting — today view only, capped/deduped inside Tempo.
  useEffect(() => {
    if (!isToday) return
    const line = selectGreeting({
      name: username,
      hour: new Date().getHours(),
      comeback: morning?.comeback ?? false,
      graceUsedLastNight: morning?.graceCoveredYesterday ?? false,
    })
    if (line) setTempoLine(line)
    // Mount-only: the shell remounts on navigation, re-running the greeting on today.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { commit, inFlight, advancedToLevel, dismissAdvancement } = useGoalCommit(
    challenge.id,
    viewingDate
  )

  function triggerShimmer(pillar: PillarName) {
    setShimmerPillars((prev) => new Set(prev).add(pillar))
    setTimeout(() => {
      setShimmerPillars((prev) => {
        const next = new Set(prev)
        next.delete(pillar)
        return next
      })
    }, 1100)
  }

  // Perfect-day seal: staggered shimmer cascade, then gold atmosphere + Tempo.
  function runSealCascade() {
    activePillarNames.forEach((p, i) => {
      setTimeout(() => triggerShimmer(p), 600 + i * 220)
    })
    setTimeout(() => {
      setSealed(true)
      setTempoLine(selectPerfectDayLine())
    }, 1200)
  }

  async function handleCommit(
    pillar: PillarName,
    level: LevelNumber,
    goalId: string,
    goalType: GoalType,
    done: boolean
  ) {
    setErrorMsg(null)
    // Optimistic — parent owns the completion state; roll back on failure.
    setCompletions((prev) => ({ ...prev, [goalId]: done }))

    const result = await commit({ pillar, goalId, goalType, done })
    if (!result.ok) {
      setCompletions((prev) => ({ ...prev, [goalId]: !done }))
      setErrorMsg(result.error)
      return
    }

    const data = result.data
    // Streak + grace always reflect the latest server truth.
    setMainStreak(data.mainStreak)
    setGraceBank(data.graceBank)

    // Destination goals are inert to streaks / ignition — nothing more to do.
    if (goalType !== 'duration') return

    setPillarStreakMap((prev) => ({ ...prev, [pillar]: data.pillarStreak }))

    if (data.advanced && data.newLevel) setAdvancedPillar(pillar)

    // Celebrations are today-only (server suppresses side-effects on past days).
    if (data.pillarCompleted && isToday) {
      if (data.daySealed) {
        runSealCascade() // cascade shimmers every pillar, including this one
      } else {
        triggerShimmer(pillar)
        setTempoLine(selectPillarCompleteLine(level))
      }
    }
  }

  // ── Live hero segments (recomputed from optimistic completions) ────────────
  const segments: HeroRingSegment[] = requiredPillarNames.map((p) => {
    const gs = goalsByPillar.get(p) ?? []
    const done = gs.filter((g) => completions[g.id] === true).length
    return { pillar: p, total: gs.length, done, color: PILLAR_CONFIG[p].title }
  })
  const totalGoals = segments.reduce((a, s) => a + s.total, 0)
  const doneGoals = segments.reduce((a, s) => a + s.done, 0)
  const greetingText =
    doneGoals === 0
      ? "Let's Do This!"
      : doneGoals < totalGoals
        ? "You've Got This!"
        : 'Day sealed. Well done.'

  const atmosphereClass = sealed ? 'atmosphere-sealed' : `atmosphere-${atmosphere}`
  const dayLabel = `Day ${getDayNumber(challenge.start_date, viewingDate)}`

  // ── Paused: frozen view, no rings ──────────────────────────────────────────
  if (isPaused && challenge.paused_at) {
    return (
      <div className={`min-h-screen atmosphere ${atmosphereClass}`}>
        <div className="mx-auto max-w-md px-4 pb-24">
          <PausedDashboard
            pausedAt={challenge.paused_at}
            pauseReason={challenge.pause_reason}
            pauseDaysUsed={challenge.pause_days_used}
            maxPauseDays={MAX_PAUSE_DAYS}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen atmosphere ${atmosphereClass}`}>
      {advancedToLevel && advancedPillar && (
        <AdvancementCelebrationModal
          pillar={advancedPillar}
          newLevel={advancedToLevel}
          onDismiss={dismissAdvancement}
        />
      )}

      <div className="mx-auto max-w-md space-y-2 px-4 pb-24">
        <HeroCard
          name={username}
          segments={segments}
          greeting={greetingText}
          mainStreak={mainStreak}
          graceBank={graceBank}
          sealed={sealed && isToday}
          dayLabel={dayLabel}
          showStreak={isToday}
          tempoLine={tempoLine}
          onTempoDismiss={() => setTempoLine(null)}
        />

        <DayStrip
          viewingDate={viewingDate}
          today={today}
          challengeStartDate={challenge.start_date}
          challengeDurationDays={challenge.duration_days}
        />

        {/* Completion countdown — today view only, days 1–5 remaining */}
        {isToday && daysRemaining >= 1 && daysRemaining <= 5 && (
          <CompletionCountdownBanner daysRemaining={daysRemaining} />
        )}

        {/* Life pause banner — today view only, taking_on_water, at least day 4 */}
        {isToday && pulseState === 'taking_on_water' && effectiveDay > 3 && <LifePauseBanner />}

        {errorMsg && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
            {errorMsg}
          </p>
        )}

        {PILLAR_ORDER.map((pillar) => {
          const pl = activeByPillar.get(pillar)
          if (!pl) return <WhisperRow key={pillar} pillar={pillar} />

          const gs = goalsByPillar.get(pillar) ?? []
          const dgs = destGoalsByPillar.get(pillar) ?? []
          const lit = gs.length > 0 && gs.every((g) => completions[g.id] === true)

          const dots = rollingWindowDates(7, viewingDate).map((date) =>
            date === viewingDate ? lit : entryByPillarDate.get(`${pillar}|${date}`)?.completed === true
          )

          return (
            <V4PillarCard
              key={pillar}
              pillar={pillar}
              level={pl.level}
              goals={gs}
              destinationGoals={dgs}
              completions={completions}
              inFlight={inFlight}
              dots={dots}
              pillarStreak={pillarStreakMap[pillar] ?? 0}
              lit={lit}
              shimmer={shimmerPillars.has(pillar)}
              onCommitGoal={(goalId, goalType, done) =>
                handleCommit(pillar, pl.level, goalId, goalType, done)
              }
            />
          )
        })}
      </div>
    </div>
  )
}
