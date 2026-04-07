'use client'

import { useState, useTransition, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { saveWeeklyReflectionSoloing } from '@/app/actions'
import { resolveExpiredDestinationGoals } from '@/lib/destination-goal-expiry'
import {
  resolveNextPillarInvitation,
  isPillarDormant,
  PILLAR_DISPLAY_NAMES,
} from '@/lib/next-pillar-invitation'
import type {
  DestinationGoal, DestinationGoalCheckInStatus, PillarLevel, PillarName,
  DurationGoalDestination,
} from '@/lib/types'

import WeeklyReflectionSummaryStep     from '@/components/grooving/WeeklyReflectionSummaryStep'
import WeeklyReflectionQuestionStep    from '@/components/grooving/WeeklyReflectionQuestionStep'
import WeeklyReflectionDestinationStep from '@/components/grooving/WeeklyReflectionDestinationStep'
import WeeklyReflectionGoalStep        from '@/components/grooving/WeeklyReflectionGoalStep'
import WeeklyReflectionPillarCheckStep from '@/components/grooving/WeeklyReflectionPillarCheckStep'
import type { PillarStat }             from '@/components/grooving/WeeklyReflectionSummaryStep'
import type { DestinationGoalResponse } from '@/components/grooving/WeeklyReflectionDestinationStep'

// ── Soloing question pool ──────────────────────────────────────────────────────
//
// Register: stewardship from a position of strength. These are not coaching
// questions for someone in struggle — they are reflective prompts for someone
// who has already proven the habit and is now living it.

const SOLOING_REFLECTION_QUESTIONS = [
  "What would the version of you who started this journey think about the habits you're living now?",
  'Which pillar feels most like who you are — not just what you do?',
  'Is there a habit that has surprised you by becoming easy? What shifted?',
  'What would you say to someone just starting where you once started?',
  'Which of your habits are you most proud of — and which still has room to deepen?',
  'What has consistency cost you this season — and was it worth it?',
  'Where do you feel most alive in your daily rhythms? Why there?',
  'If you stopped tracking tomorrow, which habits would you keep anyway? What does that tell you?',
  'What has changed in the people around you since you started living this way?',
  'What is the next thing you want to become — not do, but become?',
] as const

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

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  challengeId:               string
  weekNumber:                number
  pillars:                   string[]
  pillarDayData:             Record<string, Record<string, boolean>>
  startDate:                 string
  destinationGoals:          DestinationGoal[]
  durationGoalDestinations?: DurationGoalDestination[]
  pillarLevels:              PillarLevel[]
  lastPillarCheckAt:         string | null
  onDone:                    () => void
}

type Step = 'summary' | 'question' | 'destination' | 'goal' | 'pillar_check'

// ── Component ─────────────────────────────────────────────────────────────────

export default function SoloingWeeklyReflectionFlow({
  challengeId, weekNumber, pillars, pillarDayData, startDate, destinationGoals,
  durationGoalDestinations = [],
  pillarLevels, lastPillarCheckAt, onDone,
}: Props) {
  const { user } = useUser()
  const userId   = user?.id ?? null

  useEffect(() => {
    if (userId && challengeId) {
      resolveExpiredDestinationGoals(userId, challengeId).catch(console.error)
    }
  }, [userId, challengeId])

  const [step, setStep]                           = useState<Step>('summary')
  const [answer, setAnswer]                       = useState('')
  const [goalStatus, setGoalStatus]               = useState<DestinationGoalCheckInStatus | null>(null)
  const [destinationResponses, setDestinationResponses] = useState<Record<string, DestinationGoalResponse>>({})
  const [pillarCheckAnswer, setPillarCheckAnswer] = useState('')
  const [isPending, startTransition]              = useTransition()

  const activeGoals         = destinationGoals.filter(g => g.status === 'active')
  const hasGoals            = activeGoals.length > 0
  const activeDurationGoals = durationGoalDestinations.filter(g => g.status === 'active')
  const hasDurationGoals    = activeDurationGoals.length > 0

  const question = SOLOING_REFLECTION_QUESTIONS[(weekNumber - 1) % SOLOING_REFLECTION_QUESTIONS.length]

  // Monthly Pillar Check
  const targetPillar        = resolveNextPillarInvitation(pillarLevels)
  const showPillarCheck     = isPillarCheckDue(lastPillarCheckAt) && targetPillar !== null
  const targetDormant       = targetPillar ? isPillarDormant(targetPillar, pillarLevels) : false
  const pillarCheckQuestion = targetPillar ? getPillarCheckQuestion(targetPillar, targetDormant) : ''

  const thisWeekDates = getWeekDates(startDate, weekNumber)
  const prevWeekDates = weekNumber > 1 ? getWeekDates(startDate, weekNumber - 1) : []
  const pillarStats: PillarStat[] = pillars.map(p => ({
    pillar:   p,
    thisWeek: countDays(thisWeekDates, p, pillarDayData),
    prevWeek: countDays(prevWeekDates, p, pillarDayData),
  }))

  // Step sequencing — no pulse step at Soloing
  function stepAfterQuestion(): Step {
    if (hasDurationGoals) return 'destination'
    if (hasGoals)         return 'goal'
    if (showPillarCheck)  return 'pillar_check'
    return 'question' // sentinel — caller submits instead
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

  function buildDestinationStatuses(): { destination_goal_id: string; hits_this_week: number; frequency_target: number }[] | null {
    if (!hasDurationGoals) return null
    return activeDurationGoals.map(g => {
      const resp = destinationResponses[g.id]
      let hits = 0
      if (resp === 'on_track')    hits = g.frequency_target
      else if (resp === 'slowly') hits = Math.floor(g.frequency_target / 2)
      return { destination_goal_id: g.id, hits_this_week: hits, frequency_target: g.frequency_target }
    })
  }

  function submitAll() {
    startTransition(async () => {
      await saveWeeklyReflectionSoloing({
        challengeId,
        weekNumber,
        reflectionQuestion:      question,
        reflectionAnswer:        answer.trim() || null,
        destinationGoalStatuses: buildDestinationStatuses(),
        ...(showPillarCheck && targetPillar ? {
          pillarCheckPillar: targetPillar,
          pillarCheckAnswer: pillarCheckAnswer.trim() || null,
        } : {}),
      })
      onDone()
    })
  }

  // ── Step routing ─────────────────────────────────────────────────────────────

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
    const next = stepAfterQuestion()
    const hasMore = hasDurationGoals || hasGoals || showPillarCheck
    return (
      <WeeklyReflectionQuestionStep
        question={question}
        answer={answer}
        onAnswerChange={setAnswer}
        onContinue={() => {
          if (hasMore) setStep(next)
          else submitAll()
        }}
      />
    )
  }

  if (step === 'destination') {
    const next = stepAfterDestination()
    const hasMore = hasGoals || showPillarCheck
    return (
      <WeeklyReflectionDestinationStep
        activeDestinationGoals={activeDurationGoals}
        pillarStats={pillarStats}
        isPending={isPending}
        onContinue={responses => {
          setDestinationResponses(responses)
          if (hasMore) setStep(next)
          else submitAll()
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
        shareCircle={false}
        onShareCircleChange={() => {}}  // Grooving Circle absent at Soloing
        hasAnswer={!!answer.trim()}
        isPending={isPending}
        continueLabel={hasMore ? 'Continue →' : 'Finish reflection'}
        onContinue={() => {
          if (hasMore) setStep(next)
          else submitAll()
        }}
      />
    )
  }

  if (step === 'pillar_check') {
    return (
      <WeeklyReflectionPillarCheckStep
        pillarCheckQuestion={pillarCheckQuestion}
        pillarCheckAnswer={pillarCheckAnswer}
        onAnswerChange={setPillarCheckAnswer}
        isPending={isPending}
        onDone={submitAll}
      />
    )
  }

  return null
}
