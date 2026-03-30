'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { recordDestinationGoalStatus, startGroovingAgain, markVideoWatched } from '@/app/actions'
import { VIDEO_LIBRARY } from '@/lib/constants'
import VideoCard from '@/components/challenge/VideoCard'
import type { FocusTop5Item, DestinationGoal } from '@/lib/types'

// ── Badge display ──────────────────────────────────────────────────────────────

const BADGES = [
  { icon: '🎵', label: 'Tuning',   color: 'border-sky-700    bg-sky-950'    },
  { icon: '🎸', label: 'Jamming',  color: 'border-violet-700 bg-violet-950' },
  { icon: '🎶', label: 'Grooving', color: 'border-teal-700   bg-teal-950'   },
] as const

const PILLAR_LABEL: Record<string, string> = {
  spiritual: 'Spiritual', physical: 'Physical',
  nutritional: 'Nutritional', personal: 'Personal',
}

const PILLAR_COLOR: Record<string, string> = {
  spiritual: 'text-purple-400', physical: 'text-emerald-400',
  nutritional: 'text-amber-400', personal: 'text-blue-400',
}

// ── Compact habit calendar ─────────────────────────────────────────────────────

function CalendarGrid({
  startDate, durationDays, pillars, pillarDayData,
}: {
  startDate:    string
  durationDays: number
  pillars:      string[]
  pillarDayData: Record<string, Record<string, boolean>>
}) {
  const days: { date: string; complete: boolean }[] = []
  for (let i = 0; i < durationDays; i++) {
    const d = new Date(startDate + 'T00:00:00')
    d.setDate(d.getDate() + i)
    const date    = new Intl.DateTimeFormat('en-CA').format(d)
    const entry   = pillarDayData[date]
    const complete = !!entry && pillars.every(p => entry[p] === true)
    days.push({ date, complete })
  }

  return (
    <div className="flex flex-wrap gap-1">
      {days.map(({ date, complete }) => (
        <div
          key={date}
          className={`w-3 h-3 rounded-sm ${complete ? 'bg-teal-500' : 'bg-slate-800'}`}
          title={date}
        />
      ))}
    </div>
  )
}

// ── Share card ─────────────────────────────────────────────────────────────────

function buildShareText(
  daysCompleted: number,
  durationDays:  number,
  consistencyPct: number,
  pillars:        string[],
): string {
  const pillarNames = pillars.map(p => PILLAR_LABEL[p] ?? p).join(', ')
  return [
    `I just finished Grooving — ${daysCompleted}/${durationDays} days, ${consistencyPct}% consistency.`,
    `Pillars: ${pillarNames}.`,
    `Built with Daily Tracker.`,
  ].join('\n')
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  daysCompleted:         number
  durationDays:          number
  consistencyPct:        number
  pillars:               string[]
  soloingEligible:       boolean
  focusTop5:             FocusTop5Item[] | null
  destinationGoals:      DestinationGoal[]
  pillarDayData:         Record<string, Record<string, boolean>>
  startDate:             string
  challengeId:           string
  whatChangedReflection: string | null
  rootedMilestoneDate:   string | null
  rootedGoalId:          string | null
  watchedVideoIds:       string[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroovingCompletionScreen({
  daysCompleted, durationDays, consistencyPct, pillars,
  soloingEligible, focusTop5, destinationGoals, pillarDayData,
  startDate, challengeId, whatChangedReflection,
  rootedMilestoneDate, rootedGoalId, watchedVideoIds,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [watched, setWatched]           = useState(() => new Set(watchedVideoIds))
  const [shareStatus, setShareStatus]   = useState<'idle' | 'copied' | 'shared'>('idle')
  const [goalStatuses, setGoalStatuses] = useState<Record<string, 'reached' | 'released' | 'skip'>>(
    () => Object.fromEntries(destinationGoals.map(g => [g.id, 'skip' as const]))
  )
  const [goalSaved, setGoalSaved]       = useState<Record<string, boolean>>({})

  // G8 video
  const g8          = VIDEO_LIBRARY.find(v => v.id === 'G8') ?? null
  const g8Unwatched = g8 && !watched.has('G8')

  function handleVideoWatched(id: string) {
    setWatched(prev => new Set([...prev, id]))
    startTransition(async () => { await markVideoWatched(id, 'grooving_completion') })
  }

  async function handleShare() {
    const text = buildShareText(daysCompleted, durationDays, consistencyPct, pillars)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'I finished Grooving!', text })
        setShareStatus('shared')
      } catch {
        // user cancelled — no-op
      }
    } else {
      await navigator.clipboard.writeText(text)
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 2500)
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

  function handleGoAgain() {
    startTransition(async () => {
      await startGroovingAgain(challengeId)
      router.push('/grooving')
    })
  }

  const activeGoals = destinationGoals.filter(g => g.status === 'active')
  const allGoalsSaved = activeGoals.length === 0 || activeGoals.every(g => goalSaved[g.id])

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
      <div className="max-w-lg mx-auto px-5 pt-10 pb-20 space-y-8">

        {/* ── G8 video ─────────────────────────────────────────────────────── */}
        {g8 && (
          <VideoCard
            video={g8}
            watched={!g8Unwatched}
            onWatched={handleVideoWatched}
          />
        )}

        {/* ── Section 1: Badge collection ──────────────────────────────────── */}
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-4">
            {BADGES.map(b => (
              <div key={b.label} className={`flex flex-col items-center gap-1.5 rounded-2xl border px-4 py-3 ${b.color}`}>
                <span className="text-3xl">{b.icon}</span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">{b.label}</span>
              </div>
            ))}
          </div>
          <p className="text-white text-2xl font-black tracking-tight">
            You have been Grooving.
          </p>
        </div>

        {/* ── Section 2: Stats + compact calendar ──────────────────────────── */}
        <div className="bg-slate-900 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-black text-white">{daysCompleted}</p>
              <p className="text-xs text-slate-500 mt-0.5">of {durationDays} days</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">{consistencyPct}%</p>
              <p className="text-xs text-slate-500 mt-0.5">consistency</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">{pillars.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">pillar{pillars.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {rootedMilestoneDate && (
            <div className="border-t border-slate-800 pt-3 flex items-center gap-2">
              <span className="text-lg">🌱</span>
              <div>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Rooted</p>
                <p className="text-white text-sm">
                  {rootedGoalId ? (PILLAR_LABEL[rootedGoalId] ?? rootedGoalId) : 'All pillars'}
                  {' — '}{rootedMilestoneDate}
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-slate-800 pt-3">
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

        {/* ── Shareable card ────────────────────────────────────────────────── */}
        <div className="bg-teal-950 border border-teal-800 rounded-2xl p-5 space-y-3">
          <p className="text-teal-300 text-xs font-bold uppercase tracking-widest">Share your finish</p>
          <p className="text-white text-sm leading-relaxed">
            {daysCompleted}/{durationDays} days &middot; {consistencyPct}% consistency &middot;{' '}
            {pillars.map(p => (
              <span key={p} className={`font-bold ${PILLAR_COLOR[p] ?? 'text-white'}`}>
                {PILLAR_LABEL[p] ?? p}
              </span>
            )).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, ' + ', el], [])}
          </p>
          <button
            onClick={handleShare}
            className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 transition-colors
              text-white text-sm font-bold"
          >
            {shareStatus === 'copied' ? 'Copied to clipboard ✓'
              : shareStatus === 'shared' ? 'Shared ✓'
              : 'Share →'}
          </button>
        </div>

        {/* ── Section 3: 25/5 review ────────────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Your 25/5 focus list</p>
          {focusTop5 && focusTop5.length > 0
            ? (
              <ol className="space-y-2">
                {focusTop5.map(item => (
                  <li key={item.rank} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center
                      text-xs font-black text-slate-400">
                      {item.rank}
                    </span>
                    <p className="text-white text-sm leading-snug pt-0.5">{item.text}</p>
                  </li>
                ))}
              </ol>
            )
            : (
              <p className="text-slate-600 text-sm italic">
                The 25/5 exercise was not completed during this challenge.
              </p>
            )
          }
        </div>

        {/* ── Section 4: Destination goal status ───────────────────────────── */}
        {activeGoals.length > 0 && (
          <div className="space-y-4">
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
                      {goalStatuses[goal.id] === 'reached' ? 'Marked as reached ✓'
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
                            {opt === 'reached' ? '🎯 Reached'
                              : opt === 'released' ? '🌊 Releasing'
                              : 'Skip'}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleSaveGoalStatus(goal.id)}
                        disabled={isPending}
                        className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700
                          text-slate-300 text-xs font-bold transition-colors"
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

        {/* ── Section 5: What changed + Soloing invitation ──────────────────── */}
        {whatChangedReflection && (
          <div className="border-t border-slate-800 pt-6">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">
              What changed for you
            </p>
            <p className="text-white text-xl font-serif leading-relaxed italic">
              &ldquo;{whatChangedReflection}&rdquo;
            </p>
          </div>
        )}

        <div className="border-t border-slate-800 pt-6 space-y-4">
          {soloingEligible
            ? (
              <>
                <div className="bg-violet-950 border border-violet-700 rounded-2xl p-5 text-center space-y-2">
                  <p className="text-violet-300 text-xs font-bold uppercase tracking-widest">
                    Soloing Unlocked
                  </p>
                  <p className="text-white text-sm leading-relaxed">
                    You finished a 60+ day challenge with 80%+ consistency.
                    You&apos;re ready to go it on your own.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/soloing/onboarding')}
                  className="w-full py-4 rounded-2xl bg-violet-600 hover:bg-violet-500
                    text-white font-black text-base transition-colors"
                >
                  Start Soloing →
                </button>
                <button
                  onClick={handleGoAgain}
                  disabled={isPending}
                  className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-700
                    hover:border-slate-500 text-slate-400 hover:text-slate-200
                    text-sm font-semibold transition-colors"
                >
                  Not yet — I want to go again
                </button>
              </>
            )
            : (
              <>
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 text-center">
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Complete a 60+ day challenge with 80%+ consistency to unlock Soloing.
                  </p>
                </div>
                <button
                  onClick={handleGoAgain}
                  disabled={isPending}
                  className="w-full py-4 rounded-2xl bg-teal-700 hover:bg-teal-600
                    text-white font-black text-base transition-colors"
                >
                  Not yet — I want to go again →
                </button>
              </>
            )
          }
        </div>

      </div>
    </div>
  )
}
