'use client'

import { useState, useTransition, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { saveWeeklyReflectionWithPulse, markVideoWatched } from '@/app/actions'
import { resolveExpiredDestinationGoals } from '@/lib/destination-goal-expiry'
import { VIDEO_LIBRARY } from '@/lib/constants'
import {
  resolveNextPillarInvitation,
  isPillarDormant,
  PILLAR_DISPLAY_NAMES,
} from '@/lib/next-pillar-invitation'
import type {
  DestinationGoal, PulseState, DestinationGoalCheckInStatus, PillarLevel, PillarName,
  DurationGoalDestination,
} from '@/lib/types'

import WeeklyReflectionSummaryStep      from './WeeklyReflectionSummaryStep'
import WeeklyReflectionQuestionStep     from './WeeklyReflectionQuestionStep'
import WeeklyReflectionPulseStep        from './WeeklyReflectionPulseStep'
import WeeklyReflectionDestinationStep  from './WeeklyReflectionDestinationStep'
import WeeklyReflectionGoalStep         from './WeeklyReflectionGoalStep'
import WeeklyReflectionPillarCheckStep  from './WeeklyReflectionPillarCheckStep'
import type { PillarStat }              from './WeeklyReflectionSummaryStep'
import type { DestinationGoalResponse } from './WeeklyReflectionDestinationStep'

// ── Constants ─────────────────────────────────────────────────────────────────

const REFLECTION_QUESTIONS = [
  'Which pillar felt most alive this week — and why do you think that is?',
  'What was the hardest moment this week, and what got you through it?',
  'Is there anything about your goals that needs to change to stay honest?',
  'What would the person you were six months ago think about who you are becoming?',
  'Which of your 25/5 top five felt closest this week?',
  'Where did the Tyranny of the Urgent win this week — and what would you do differently?',
  'Is your pace sustainable? What needs to be adjusted to protect that?',
  'What habit feels most automatic now? What still requires intentional effort?',
  'Who in your life has noticed something different about you? What did they see?',
  "If your habits are building something — what is it building toward?",
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

function getWeekDates(startDate: string, weekNumber: number): string[] {
  const offset = (weekNumber - 1) * 7
  return Array.from({ length: 7 }, (_, i) => addDays(startDate, offset + i))
}

function countDays(dates: string[], pillar: string, data: Record<string, Record<string, boolean>>): number {
  return dates.filter(d => data[d]?.[pillar] === true).length
}

function isPillarCheckDue(lastPillarCheckAt: string | null): boolean {
  if (!lastPillarCheckAt) return true
  const daysSince = (Date.now() - new Date(lastPillarCheckAt).getTime()) / 86_400_000
  return daysSince >= 30
}

function getPillarCheckQuestion(pillar: PillarName, dormant: boolean): string {
  const name = PILLAR_DISPLAY_NAMES[pillar]
  if (dormant) {
    if (pillar === 'missional') {
      return `The Missional pillar hasn't started yet. Who is one person in your life right now that you could begin praying for intentionally every day?`
    }
    return `You haven't started a ${name} goal yet. Is there something in the way — or is this just not the right time?`
  }
  return `${name} is your most underdeveloped pillar. If you were to add one simple habit there, what would it be?`
}

function getPulseVideoId(state: PulseState, lvl: number): string | null {
  if (lvl === 3) {
    if (state === 'smooth_sailing')  return 'G_SMOOTH'
    if (state === 'rough_waters')    return 'G_ROUGH'
    if (state === 'taking_on_water') return 'G_WATER'
  }
  if (lvl === 2) {
    if (state === 'smooth_sailing')  return 'J4'
    if (state === 'rough_waters')    return 'J5'
    if (state === 'taking_on_water') return 'J6'
  }
  return null
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  challengeId:              string
  weekNumber:               number
  pillars:                  string[]
  pillarDayData:            Record<string, Record<string, boolean>>
  startDate:                string
  destinationGoals:         DestinationGoal[]
  durationGoalDestinations?: DurationGoalDestination[]
  level?:                   number
  watchedVideoIds?:         string[]
  pillarLevels:             PillarLevel[]
  lastPillarCheckAt:        string | null
  onDone:                   () => void
}

type Step = 'summary' | 'question' | 'pulse' | 'destination' | 'goal' | 'pillar_check'

// ── Component ─────────────────────────────────────────────────────────────────

export default function WeeklyReflectionFlow({
  challengeId, weekNumber, pillars, pillarDayData, startDate, destinationGoals,
  durationGoalDestinations = [],
  level = 3, watchedVideoIds = [], pillarLevels, lastPillarCheckAt, onDone,
}: Props) {
  const { user }  = useUser()
  const userId    = user?.id ?? null

  // Resolve any expired destination goals before the flow renders steps.
  // Fire-and-forget — must not block the reflection flow from loading.
  useEffect(() => {
    if (userId && challengeId) {
      resolveExpiredDestinationGoals(userId, challengeId).catch(console.error)
    }
  }, [userId, challengeId])

  const [step, setStep]                           = useState<Step>('summary')
  const [answer, setAnswer]                       = useState('')
  const [pulseState, setPulseState]               = useState<PulseState | null>(null)
  const [goalStatus, setGoalStatus]               = useState<DestinationGoalCheckInStatus | null>(null)
  const [destinationResponses, setDestinationResponses] = useState<Record<string, DestinationGoalResponse>>({})
  const [pillarCheckAnswer, setPillarCheckAnswer] = useState('')
  const [shareCircle, setShareCircle]             = useState(false)
  const [isPending, startTransition]              = useTransition()
  const [videoWatched, setVideoWatched]           = useState<Set<string>>(new Set(watchedVideoIds))
  const [, startVideoTransition]                  = useTransition()

  function handleVideoWatched(videoId: string) {
    setVideoWatched(prev => new Set([...prev, videoId]))
    startVideoTransition(async () => {
      await markVideoWatched(videoId, 'weekly_reflection_pulse')
    })
  }

  // Legacy destination goals (destination_goals table)
  const activeGoals  = destinationGoals.filter(g => g.status === 'active')
  const hasGoals     = activeGoals.length > 0

  // Phase 5 duration goal destinations (duration_goal_destinations table)
  const activeDurationGoals = durationGoalDestinations.filter(g => g.status === 'active')
  const hasDurationGoals    = activeDurationGoals.length > 0

  const question = REFLECTION_QUESTIONS[(weekNumber - 1) % REFLECTION_QUESTIONS.length]

  // Monthly Pillar Check
  const targetPillar        = resolveNextPillarInvitation(pillarLevels)
  const showPillarCheck     = isPillarCheckDue(lastPillarCheckAt) && targetPillar !== null
  const targetDormant       = targetPillar ? isPillarDormant(targetPillar, pillarLevels) : false
  const pillarCheckQuestion = targetPillar ? getPillarCheckQuestion(targetPillar, targetDormant) : ''

  // Pillar stats for summary and destination coaching note
  const thisWeekDates = getWeekDates(startDate, weekNumber)
  const prevWeekDates = weekNumber > 1 ? getWeekDates(startDate, weekNumber - 1) : []
  const pillarStats: PillarStat[] = pillars.map(p => ({
    pillar:   p,
    thisWeek: countDays(thisWeekDates, p, pillarDayData),
    prevWeek: countDays(prevWeekDates, p, pillarDayData),
  }))

  // Pulse coaching video
  const pulseVideoId   = pulseState ? getPulseVideoId(pulseState, level) : null
  const pulseVideo     = pulseVideoId ? VIDEO_LIBRARY.find(v => v.id === pulseVideoId) ?? null : null
  const showPulseVideo = pulseVideo !== null && !videoWatched.has(pulseVideo.id)

  // Step sequencing helpers
  function stepAfterPulse(): Step {
    if (hasDurationGoals)   return 'destination'
    if (hasGoals)           return 'goal'
    if (showPillarCheck)    return 'pillar_check'
    return 'pulse' // sentinel — caller submits instead
  }

  function stepAfterDestination(): Step {
    if (hasGoals)        return 'goal'
    if (showPillarCheck) return 'pillar_check'
    return 'destination' // sentinel — caller submits instead
  }

  function stepAfterGoal(): Step {
    if (showPillarCheck) return 'pillar_check'
    return 'goal' // sentinel — caller submits instead
  }

  // Map destination responses to the DB shape for saveWeeklyReflectionWithPulse
  function buildDestinationStatuses(): { destination_goal_id: string; hits_this_week: number; frequency_target: number }[] | null {
    if (!hasDurationGoals) return null
    return activeDurationGoals.map(g => {
      const resp = destinationResponses[g.id]
      let hits = 0
      if (resp === 'on_track')      hits = g.frequency_target
      else if (resp === 'slowly')   hits = Math.floor(g.frequency_target / 2)
      // 'not_this_week' → 0 (default)
      return { destination_goal_id: g.id, hits_this_week: hits, frequency_target: g.frequency_target }
    })
  }

  function submitAll(destStatus: DestinationGoalCheckInStatus | null) {
    if (!pulseState) return
    startTransition(async () => {
      await saveWeeklyReflectionWithPulse({
        challengeId,
        weekNumber,
        reflectionQuestion:       question,
        reflectionAnswer:         answer.trim() || null,
        pulseState,
        destinationGoalStatus:    destStatus,
        destinationGoalStatuses:  buildDestinationStatuses(),
        shareWithCircle:          shareCircle,
        ...(showPillarCheck && targetPillar ? {
          pillarCheckPillar: targetPillar,
          pillarCheckAnswer: pillarCheckAnswer.trim() || null,
        } : {}),
      })
      onDone()
    })
  }

  // ── Step routing ────────────────────────────────────────────────────────────

  if (step === 'summary') {
    return (
      <WeeklyReflectionSummaryStep
        weekNumber={weekNumber}
        pillarStats={pillarStats}
        onContinue={() => setStep('question')}
      />
    )
  }

  if (step === 'question') {
    return (
      <WeeklyReflectionQuestionStep
        question={question}
        answer={answer}
        onAnswerChange={setAnswer}
        onContinue={() => setStep('pulse')}
      />
    )
  }

  if (step === 'pulse') {
    const next = stepAfterPulse()
    const hasMore = hasDurationGoals || hasGoals || showPillarCheck
    return (
      <WeeklyReflectionPulseStep
        pulseState={pulseState}
        onPulseChange={setPulseState}
        isPending={isPending}
        pulseVideo={pulseVideo}
        showPulseVideo={showPulseVideo}
        videoWatched={videoWatched}
        onVideoWatched={handleVideoWatched}
        continueLabel={hasMore ? 'Continue →' : 'Done →'}
        onContinue={() => {
          if (hasMore) setStep(next)
          else submitAll(null)
        }}
      />
    )
  }

  if (step === 'destination') {
    return (
      <WeeklyReflectionDestinationStep
        activeDestinationGoals={activeDurationGoals}
        pillarStats={pillarStats}
        isPending={isPending}
        onContinue={responses => {
          setDestinationResponses(responses)
          const next = stepAfterDestination()
          const hasMore = hasGoals || showPillarCheck
          if (hasMore) setStep(next)
          else submitAll(goalStatus)
        }}
      />
    )
  }

  if (step === 'goal') {
    const next = stepAfterGoal()
    const hasMore = showPillarCheck
    return (
      <WeeklyReflectionGoalStep
        activeGoals={activeGoals}
        goalStatus={goalStatus}
        onGoalStatusChange={setGoalStatus}
        shareCircle={shareCircle}
        onShareCircleChange={setShareCircle}
        hasAnswer={answer.trim().length > 0}
        isPending={isPending}
        continueLabel={hasMore ? 'Continue →' : 'Done →'}
        onContinue={() => {
          if (hasMore) setStep(next)
          else submitAll(goalStatus)
        }}
      />
    )
  }

  // step === 'pillar_check'
  return (
    <WeeklyReflectionPillarCheckStep
      pillarCheckQuestion={pillarCheckQuestion}
      pillarCheckAnswer={pillarCheckAnswer}
      onAnswerChange={setPillarCheckAnswer}
      isPending={isPending}
      onDone={() => submitAll(goalStatus)}
    />
  )
}
