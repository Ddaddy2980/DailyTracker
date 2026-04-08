'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveWhatChangedReflection, startSoloingAgain, recordDestinationGoalStatus } from '@/app/actions'
import type { DestinationGoal } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const PILLAR_LABEL: Record<string, string> = {
  spiritual:   'Spiritual',
  physical:    'Physical',
  nutritional: 'Nutritional',
  personal:    'Personal',
  missional:   'Missional',
}

const PILLAR_COLOR: Record<string, string> = {
  spiritual:   'text-blue-400',
  physical:    'text-emerald-400',
  nutritional: 'text-amber-400',
  personal:    'text-green-400',
  missional:   'text-teal-400',
}

const REFLECTION_QUESTION =
  'Before we mark this moment — what has this pillar built in you that you didn\'t have when you started Soloing?'

// ── Compact calendar ──────────────────────────────────────────────────────────

function CalendarGrid({
  startDate, durationDays, pillars, pillarDayData,
}: {
  startDate:     string
  durationDays:  number
  pillars:       string[]
  pillarDayData: Record<string, Record<string, boolean>>
}) {
  const days: { date: string; complete: boolean }[] = []
  for (let i = 0; i < durationDays; i++) {
    const d = new Date(startDate + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const date     = new Intl.DateTimeFormat('en-CA').format(d)
    const entry    = pillarDayData[date]
    const complete = !!entry && pillars.every(p => entry[p] === true)
    days.push({ date, complete })
  }
  return (
    <div className="flex flex-wrap gap-1">
      {days.map(({ date, complete }) => (
        <div
          key={date}
          className={`w-3 h-3 rounded-sm ${complete ? 'bg-violet-500' : 'bg-slate-800'}`}
          title={date}
        />
      ))}
    </div>
  )
}

// ── Phase types ───────────────────────────────────────────────────────────────

type Phase = 'reflection' | 'celebrating' | 'inviting' | 'summary'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  daysCompleted:          number
  durationDays:           number
  consistencyPct:         number
  pillars:                string[]
  streak:                 number
  longestStreak:          number
  orchestratingEligible:  boolean
  advancingPillars:       string[]   // pillars that hit 80%+ and qualify for Orchestrating
  allPillarLevelsAtFour:  boolean    // true when all 5 pillar_levels rows ≥ level 4 (Ceiling Conversation trigger)
  destinationGoals:       DestinationGoal[]
  pillarDayData:          Record<string, Record<string, boolean>>
  startDate:              string
  challengeId:            string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SoloingCompletionScreen({
  daysCompleted, durationDays, consistencyPct, pillars, streak, longestStreak,
  orchestratingEligible, advancingPillars, allPillarLevelsAtFour,
  destinationGoals, pillarDayData, startDate, challengeId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Phase navigation
  const initialPhase: Phase = orchestratingEligible ? 'reflection' : 'summary'
  const [phase, setPhase]             = useState<Phase>(initialPhase)
  const [pillarIndex, setPillarIndex] = useState(0)

  // Reflection state (Orchestrating path)
  const [reflectionAnswer, setReflectionAnswer]   = useState('')
  const [reflectionSkipped, setReflectionSkipped] = useState(false)

  // Summary path — destination goal status picker
  const [goalStatuses, setGoalStatuses] = useState<Record<string, 'reached' | 'released' | 'skip'>>(
    () => Object.fromEntries(destinationGoals.map(g => [g.id, 'skip' as const]))
  )
  const [goalSaved, setGoalSaved] = useState<Record<string, boolean>>({})

  // Summary path — share card
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle')

  // Summary path — go-again duration picker
  const [goAgainDays, setGoAgainDays] = useState<90 | 100>(
    durationDays >= 100 ? 100 : 90
  )

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleSaveReflection() {
    if (!reflectionAnswer.trim()) { setReflectionSkipped(true); setPhase('celebrating'); return }
    startTransition(async () => {
      await saveWhatChangedReflection(reflectionAnswer.trim())
      setPhase('celebrating')
    })
  }

  function handleSkipReflection() {
    setReflectionSkipped(true)
    setPhase('celebrating')
  }
  void reflectionSkipped

  function handleNextPillar() {
    if (pillarIndex < advancingPillars.length - 1) {
      setPillarIndex(i => i + 1)
    } else {
      setPhase('inviting')
    }
  }

  function handleGoalStatusChange(goalId: string, status: 'reached' | 'released' | 'skip') {
    setGoalStatuses(prev => ({ ...prev, [goalId]: status }))
  }

  function handleSaveGoalStatus(goalId: string) {
    const status = goalStatuses[goalId]
    if (!status || status === 'skip') {
      setGoalSaved(prev => ({ ...prev, [goalId]: true }))
      return
    }
    startTransition(async () => {
      await recordDestinationGoalStatus(goalId, status)
      setGoalSaved(prev => ({ ...prev, [goalId]: true }))
    })
  }

  async function handleShare() {
    const pillarNames = pillars.map(p => PILLAR_LABEL[p] ?? p).join(' + ')
    const text = [
      `I just finished ${durationDays} days of Soloing — ${daysCompleted} days completed, ${consistencyPct}% consistency.`,
      `Pillars: ${pillarNames}.`,
      `Living on Purpose — Daily Consistency Tracker`,
    ].join('\n')
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'I finished Soloing!', text })
        setShareStatus('shared')
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text)
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 2500)
    }
  }

  function handleGoAgain() {
    startTransition(async () => {
      await startSoloingAgain(challengeId, goAgainDays)
      router.push('/soloing')
    })
  }

  // ── Phase: Reflection ─────────────────────────────────────────────────────

  if (phase === 'reflection') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 pt-12 pb-20 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-violet-400 text-xs font-bold uppercase tracking-widest">
              Mark the moment
            </p>
            <h1 className="text-white text-2xl font-black leading-snug">
              {daysCompleted} days. {consistencyPct}%.<br />
              You Soloed.
            </h1>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4">
            <p className="text-slate-300 text-sm leading-relaxed">
              {REFLECTION_QUESTION}
            </p>
            <textarea
              value={reflectionAnswer}
              onChange={e => setReflectionAnswer(e.target.value)}
              placeholder="Take a moment…"
              rows={5}
              className="w-full bg-slate-800 text-white text-sm rounded-2xl px-4 py-3
                placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-600
                resize-none leading-relaxed"
            />
            <button
              onClick={handleSaveReflection}
              disabled={isPending}
              className="w-full py-3 rounded-2xl font-bold text-white bg-violet-600
                hover:bg-violet-500 disabled:opacity-40 transition-colors"
            >
              {isPending ? 'Saving…' : 'Save →'}
            </button>
            <button
              onClick={handleSkipReflection}
              className="w-full text-slate-600 hover:text-slate-400 text-sm transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Phase: Celebrating (per-pillar stepped) ───────────────────────────────

  if (phase === 'celebrating') {
    const pillar = advancingPillars[pillarIndex]
    const isLast = pillarIndex === advancingPillars.length - 1

    // Per-pillar stats from pillarDayData
    const pillarDays = Object.values(pillarDayData).filter(day => day[pillar] === true).length
    const pillarPct  = Math.round((pillarDays / durationDays) * 100)
    const destReached = destinationGoals.filter(
      g => g.pillar === pillar && g.status === 'reached'
    ).length

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 pt-12 pb-20 space-y-6">

          {/* Progress dots */}
          {advancingPillars.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              {advancingPillars.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all ${
                    i === pillarIndex
                      ? 'w-4 h-2 bg-violet-500'
                      : i < pillarIndex
                      ? 'w-2 h-2 bg-violet-400'
                      : 'w-2 h-2 bg-slate-700'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Badge + pillar name */}
          <div className="text-center space-y-3">
            <span className="text-6xl">🎼</span>
            <p className={`text-xs font-bold uppercase tracking-widest ${PILLAR_COLOR[pillar] ?? 'text-violet-400'}`}>
              {PILLAR_LABEL[pillar] ?? pillar}
            </p>
            <p className="text-white text-xl font-black">Now Orchestrating</p>
          </div>

          {/* Stats */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xl font-black text-white">{pillarDays}</p>
                <p className="text-xs text-slate-500 mt-0.5">of {durationDays} days</p>
              </div>
              <div>
                <p className="text-xl font-black text-white">{pillarPct}%</p>
                <p className="text-xs text-slate-500 mt-0.5">consistency</p>
              </div>
              <div>
                <p className="text-xl font-black text-white">{streak}</p>
                <p className="text-xs text-slate-500 mt-0.5">day streak</p>
              </div>
              <div>
                <p className="text-xl font-black text-white">{destReached}</p>
                <p className="text-xs text-slate-500 mt-0.5">goals reached</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleNextPillar}
            className="w-full py-3 rounded-2xl font-bold text-white bg-violet-600
              hover:bg-violet-500 transition-colors"
          >
            {isLast ? 'Continue →' : `Next: ${PILLAR_LABEL[advancingPillars[pillarIndex + 1]] ?? ''} →`}
          </button>
        </div>
      </div>
    )
  }

  // ── Phase: Inviting ───────────────────────────────────────────────────────

  if (phase === 'inviting') {
    const pillarNames = advancingPillars.map(p => PILLAR_LABEL[p] ?? p).join(', ')

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 pt-12 pb-20 space-y-6">

          {/* Ceiling Conversation — fires when all five pillars reach Soloing */}
          {allPillarLevelsAtFour && (
            <div className="bg-violet-950 border border-violet-700 rounded-3xl p-6 space-y-3 text-center">
              <span className="text-4xl">🎼</span>
              <p className="text-white text-base font-semibold leading-relaxed">
                You&apos;ve done something most people never do. Every area of your life is living
                on purpose. The question now isn&apos;t whether you can build these habits.
                It&apos;s whether you&apos;re willing to help someone else build theirs.
                That&apos;s what Orchestrating is for.
              </p>
            </div>
          )}

          {/* Orchestrating invitation */}
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-3">
            <p className="text-violet-400 text-xs font-bold uppercase tracking-widest">
              Orchestrating Unlocked
            </p>
            <p className="text-white text-sm leading-relaxed">
              {advancingPillars.length > 1
                ? `${pillarNames} are ready for the next level.`
                : `${pillarNames} is ready for the next level.`
              }
              {' '}You&apos;ve proven you can do this. Orchestrating is what comes next.
            </p>
          </div>

          {/* Phase 7 placeholder — restore "Begin Orchestrating →" button when
              /orchestrating/onboarding exists. See CLAUDE.md Known Deferred Items. */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 text-center space-y-2">
            <p className="text-white text-sm font-semibold leading-relaxed">
              You&apos;ve reached something most people never find.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Orchestrating is coming — and you&apos;ll be ready for it.
              For now, keep building the life you&apos;ve already built.
            </p>
          </div>

          <button
            onClick={() => router.push('/soloing')}
            className="w-full py-3 rounded-2xl text-slate-400 hover:text-slate-200
              text-sm font-semibold border border-slate-800 hover:border-slate-600
              transition-colors"
          >
            Return to dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── Phase: Summary (non-eligible path) ───────────────────────────────────

  const activeGoals    = destinationGoals.filter(g => g.status === 'active')
  const closedGoals    = destinationGoals.filter(g => g.status !== 'active')
  const goalsReached   = destinationGoals.filter(g => g.status === 'reached').length

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
      <div className="max-w-lg mx-auto px-5 pt-12 pb-20 space-y-6">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <span className="text-5xl">🎻</span>
          <p className="text-violet-400 text-xs font-bold uppercase tracking-widest">Soloing complete</p>
          <p className="text-white text-2xl font-black leading-snug">
            {daysCompleted} days.<br />{consistencyPct}% consistency.
          </p>
        </div>

        {/* ── Stats grid ────────────────────────────────────────────────────── */}
        <div className="bg-slate-900 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-2xl font-black text-white">{daysCompleted}</p>
              <p className="text-xs text-slate-500 mt-0.5">of {durationDays} days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white">{consistencyPct}%</p>
              <p className="text-xs text-slate-500 mt-0.5">consistency</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white">{longestStreak}</p>
              <p className="text-xs text-slate-500 mt-0.5">longest streak</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-white">{goalsReached}</p>
              <p className="text-xs text-slate-500 mt-0.5">goals reached</p>
            </div>
          </div>

          {/* Habit calendar */}
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              Your {durationDays}-day habit map
            </p>
            <CalendarGrid
              startDate={startDate}
              durationDays={durationDays}
              pillars={pillars}
              pillarDayData={pillarDayData}
            />
          </div>
        </div>

        {/* ── Share card ────────────────────────────────────────────────────── */}
        <div className="bg-violet-950 border border-violet-800 rounded-2xl p-5 space-y-3">
          <p className="text-violet-300 text-xs font-bold uppercase tracking-widest">Share your finish</p>
          <p className="text-white text-sm leading-relaxed">
            {daysCompleted}/{durationDays} days &middot; {consistencyPct}% consistency &middot;{' '}
            {pillars.map((p, i) => (
              <span key={p}>
                {i > 0 && <span className="text-slate-500"> + </span>}
                <span className={`font-bold ${PILLAR_COLOR[p] ?? 'text-white'}`}>
                  {PILLAR_LABEL[p] ?? p}
                </span>
              </span>
            ))}
          </p>
          <p className="text-slate-500 text-xs">Living on Purpose — Daily Consistency Tracker</p>
          <button
            onClick={handleShare}
            className="w-full py-2.5 rounded-xl bg-violet-700 hover:bg-violet-600
              transition-colors text-white text-sm font-bold"
          >
            {shareStatus === 'copied' ? 'Copied to clipboard ✓'
              : shareStatus === 'shared' ? 'Shared ✓'
              : 'Share →'}
          </button>
        </div>

        {/* ── Active destination goals — interactive picker ─────────────────── */}
        {activeGoals.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              How did your direction goals land?
            </p>
            {activeGoals.map(goal => (
              <div key={goal.id} className="bg-slate-900 rounded-2xl p-4 space-y-3">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest ${PILLAR_COLOR[goal.pillar] ?? 'text-slate-400'}`}>
                    {PILLAR_LABEL[goal.pillar] ?? goal.pillar}
                  </p>
                  <p className="text-white text-sm font-semibold mt-0.5">{goal.goal_name}</p>
                </div>
                {goalSaved[goal.id]
                  ? (
                    <p className="text-slate-500 text-xs italic">
                      {goalStatuses[goal.id] === 'reached'  ? 'Marked as reached ✓'
                        : goalStatuses[goal.id] === 'released' ? 'Marked as released ✓'
                        : 'Skipped'}
                    </p>
                  )
                  : (
                    <>
                      <div className="flex gap-2">
                        {(['reached', 'released', 'skip'] as const).map(opt => (
                          <button
                            key={opt}
                            onClick={() => handleGoalStatusChange(goal.id, opt)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors
                              ${goalStatuses[goal.id] === opt
                                ? 'bg-violet-700 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                          >
                            {opt === 'reached'  ? '🎯 Reached'
                              : opt === 'released' ? '🌊 Releasing'
                              : 'Skip'}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleSaveGoalStatus(goal.id)}
                        disabled={isPending}
                        className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700
                          text-slate-300 text-xs font-bold transition-colors disabled:opacity-40"
                      >
                        Save
                      </button>
                    </>
                  )
                }
              </div>
            ))}
          </div>
        )}

        {/* ── Closed destination goals — read-only ──────────────────────────── */}
        {closedGoals.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
              {activeGoals.length > 0 ? 'Other goals' : 'Direction goals this challenge'}
            </p>
            {closedGoals.map(g => (
              <div key={g.id} className="flex items-center justify-between bg-slate-900 rounded-xl px-4 py-3">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wide ${PILLAR_COLOR[g.pillar] ?? 'text-slate-500'}`}>
                    {PILLAR_LABEL[g.pillar] ?? g.pillar}
                  </p>
                  <p className="text-white text-sm mt-0.5">{g.goal_name}</p>
                </div>
                <span className={`text-xs font-semibold capitalize ${
                  g.status === 'reached'  ? 'text-violet-400'
                  : g.status === 'released' ? 'text-slate-400'
                  : 'text-slate-600'
                }`}>
                  {g.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Non-eligible notice ───────────────────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-slate-500 text-xs leading-relaxed">
            {durationDays < 90
              ? `Orchestrating requires 90+ days with 80%+ consistency. This challenge was ${durationDays} days.`
              : `Orchestrating requires 80%+ consistency across all advancing pillars. You were at ${consistencyPct}%.`}
          </p>
        </div>

        {/* ── Go again — duration picker + CTA ─────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Start another Soloing challenge
          </p>
          <div className="space-y-2">
            {([90, 100] as const).map(days => (
              <button
                key={days}
                onClick={() => setGoAgainDays(days)}
                className={`w-full flex items-center justify-between rounded-2xl border-2 px-5 py-4
                  transition-all text-left ${
                  goAgainDays === days
                    ? 'border-violet-600 bg-violet-950'
                    : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                }`}
              >
                <div>
                  <p className={`font-black ${goAgainDays === days ? 'text-violet-300' : 'text-white'}`}>
                    {days} Days
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {days === 90 ? 'Three months of Soloing.' : 'The full commitment.'}
                  </p>
                </div>
                {goAgainDays === days && <span className="text-violet-400 font-bold text-lg">✓</span>}
              </button>
            ))}
          </div>
          <button
            onClick={handleGoAgain}
            disabled={isPending}
            className="w-full py-4 rounded-2xl font-black text-white text-base
              bg-violet-600 hover:bg-violet-500 disabled:opacity-40 transition-colors"
          >
            {isPending ? 'Starting…' : 'Begin →'}
          </button>
        </div>

      </div>
    </div>
  )
}
