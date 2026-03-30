'use client'

import { useState, useTransition } from 'react'
import { saveWeeklyReflectionWithPulse, markVideoWatched } from '@/app/actions'
import { VIDEO_LIBRARY } from '@/lib/constants'
import VideoCard from '@/components/challenge/VideoCard'
import type { DestinationGoal, PulseState, DestinationGoalCheckInStatus } from '@/lib/types'

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

const PILLAR_LABEL: Record<string, string> = {
  spiritual: 'Spiritual', physical: 'Physical',
  nutritional: 'Nutritional', personal: 'Personal',
}
const PILLAR_DOT: Record<string, string> = {
  spiritual: 'bg-purple-400', physical: 'bg-emerald-400',
  nutritional: 'bg-amber-400', personal: 'bg-blue-400',
}
const PILLAR_BAR: Record<string, string> = {
  spiritual: 'bg-purple-500', physical: 'bg-emerald-500',
  nutritional: 'bg-amber-500', personal: 'bg-blue-500',
}

type PulseOption = { state: PulseState; label: string; body: string; icon: string; ring: string }
const PULSE_OPTIONS: PulseOption[] = [
  { state: 'smooth_sailing',  label: 'Smooth Sailing',   body: "I've got this. Habits are forming.",    icon: '⛵', ring: 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-950' },
  { state: 'rough_waters',    label: 'Rough Waters',     body: "It's hard but I'm still in it.",        icon: '🌊', ring: 'border-amber-500 ring-2 ring-amber-500 bg-amber-950'     },
  { state: 'taking_on_water', label: 'Taking On Water',  body: "I'm struggling and close to quitting.", icon: '🆘', ring: 'border-red-500 ring-2 ring-red-500 bg-red-950'           },
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

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  challengeId:      string
  weekNumber:       number
  pillars:          string[]
  pillarDayData:    Record<string, Record<string, boolean>>
  startDate:        string
  destinationGoals: DestinationGoal[]
  level?:           number    // 2 = Jamming, 3 = Grooving; defaults to 3
  watchedVideoIds?: string[]
  onDone:           () => void
}

type Step = 'summary' | 'question' | 'pulse' | 'goal'

// ── Component ─────────────────────────────────────────────────────────────────

// Returns the coaching video ID appropriate for the pulse state at a given level.
// level 3 (Grooving) → G_SMOOTH / G_ROUGH / G_WATER
// level 2 (Jamming)  → J4 / J5 / J6
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

export default function WeeklyReflectionFlow({
  challengeId, weekNumber, pillars, pillarDayData, startDate, destinationGoals,
  level = 3, watchedVideoIds = [], onDone,
}: Props) {
  const [step, setStep]               = useState<Step>('summary')
  const [answer, setAnswer]           = useState('')
  const [pulseState, setPulseState]   = useState<PulseState | null>(null)
  const [goalStatus, setGoalStatus]   = useState<DestinationGoalCheckInStatus | null>(null)
  const [shareCircle, setShareCircle] = useState(false)
  const [isPending, startTransition]  = useTransition()
  const [videoWatched, setVideoWatched]   = useState<Set<string>>(new Set(watchedVideoIds))
  const [, startVideoTransition]          = useTransition()

  function handleVideoWatched(videoId: string) {
    setVideoWatched(prev => new Set([...prev, videoId]))
    startVideoTransition(async () => {
      await markVideoWatched(videoId, 'weekly_reflection_pulse')
    })
  }

  const activeGoals  = destinationGoals.filter(g => g.status === 'active')
  const hasGoals     = activeGoals.length > 0
  const question     = REFLECTION_QUESTIONS[(weekNumber - 1) % REFLECTION_QUESTIONS.length]

  // Pillar stats: current week vs previous week
  const thisWeekDates = getWeekDates(startDate, weekNumber)
  const prevWeekDates = weekNumber > 1 ? getWeekDates(startDate, weekNumber - 1) : []
  const pillarStats   = pillars.map(p => ({
    pillar:    p,
    thisWeek:  countDays(thisWeekDates, p, pillarDayData),
    prevWeek:  countDays(prevWeekDates, p, pillarDayData),
  }))

  // Pulse coaching video — computed before early returns so it's stable across renders
  const pulseVideoId   = pulseState ? getPulseVideoId(pulseState, level) : null
  const pulseVideo     = pulseVideoId ? VIDEO_LIBRARY.find(v => v.id === pulseVideoId) ?? null : null
  const showPulseVideo = pulseVideo !== null && !videoWatched.has(pulseVideo.id)

  function submitAll(destStatus: DestinationGoalCheckInStatus | null) {
    if (!pulseState) return
    startTransition(async () => {
      await saveWeeklyReflectionWithPulse({
        challengeId,
        weekNumber,
        reflectionQuestion:    question,
        reflectionAnswer:      answer.trim() || null,
        pulseState,
        destinationGoalStatus: destStatus,
        shareWithCircle:       shareCircle,
      })
      onDone()
    })
  }

  // ── Step: Summary ──────────────────────────────────────────────────────────
  if (step === 'summary') return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Week {weekNumber} Review</p>
        <p className="text-white font-bold text-base">How did this week go?</p>
      </div>

      <div className="space-y-2">
        {pillarStats.map(({ pillar, thisWeek, prevWeek }) => {
          const delta = thisWeek - prevWeek
          return (
            <div key={pillar} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PILLAR_DOT[pillar] ?? 'bg-slate-500'}`} />
              <span className="text-slate-300 text-xs font-semibold w-24 shrink-0">
                {PILLAR_LABEL[pillar] ?? pillar}
              </span>
              <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${PILLAR_BAR[pillar] ?? 'bg-slate-500'}`}
                  style={{ width: `${Math.round((thisWeek / 7) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-white w-6 text-right shrink-0">{thisWeek}/7</span>
              {weekNumber > 1 && (
                <span className={`text-xs w-8 text-right shrink-0 ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={() => setStep('question')}
        className="w-full py-3 bg-violet-700 hover:bg-violet-600 text-white font-bold rounded-2xl transition-colors"
      >
        Continue →
      </button>
    </div>
  )

  // ── Step: Reflection question ──────────────────────────────────────────────
  if (step === 'question') return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Reflect</p>
        <p className="text-white font-bold text-base leading-snug">{question}</p>
      </div>

      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Take a moment… there's no wrong answer."
        rows={4}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white
          placeholder-slate-500 resize-none focus:outline-none focus:border-violet-500 transition-colors"
      />

      <button
        onClick={() => setStep('pulse')}
        className="w-full py-3 bg-violet-700 hover:bg-violet-600 text-white font-bold rounded-2xl transition-colors"
      >
        {answer.trim() ? 'Continue →' : 'Skip →'}
      </button>
    </div>
  )

  // ── Step: Pulse check ──────────────────────────────────────────────────────
  if (step === 'pulse') return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-400">Pulse check</p>
        <p className="text-white font-bold text-base">How are you feeling about the challenge right now?</p>
      </div>

      <div className="flex flex-col gap-2">
        {PULSE_OPTIONS.map(opt => (
          <button
            key={opt.state}
            onClick={() => setPulseState(opt.state)}
            className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
              pulseState === opt.state
                ? `${opt.ring} ring-offset-2 ring-offset-slate-950`
                : 'bg-slate-900 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{opt.icon}</span>
              <div>
                <p className={`font-black text-sm ${pulseState === opt.state ? 'text-white' : 'text-slate-300'}`}>{opt.label}</p>
                <p className={`text-xs mt-0.5 ${pulseState === opt.state ? 'text-slate-300' : 'text-slate-500'}`}>{opt.body}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Pulse coaching video — level-aware; disappears once watched */}
      {showPulseVideo && pulseVideo && (
        <VideoCard video={pulseVideo} watched={false} onWatched={handleVideoWatched} />
      )}

      <button
        onClick={() => { if (hasGoals) setStep('goal'); else submitAll(null) }}
        disabled={!pulseState || isPending}
        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-white transition-colors"
      >
        {isPending ? 'Saving…' : hasGoals ? 'Continue →' : 'Done →'}
      </button>
    </div>
  )

  // ── Step: Destination goal check-in ───────────────────────────────────────
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Direction check</p>
        <p className="text-white font-bold text-base leading-snug">Are you still moving toward your destination goal{activeGoals.length > 1 ? 's' : ''}?</p>
      </div>

      {/* Show active goal names */}
      <div className="space-y-1.5">
        {activeGoals.map(g => (
          <p key={g.id} className="text-slate-400 text-sm leading-snug">
            <span className="text-slate-500 text-xs uppercase tracking-wide">{PILLAR_LABEL[g.pillar] ?? g.pillar}: </span>
            {g.goal_name}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {([
          { value: 'yes',    label: 'Yes — I can feel it',        icon: '✅' },
          { value: 'slowly', label: 'Slowly — but I haven\'t quit', icon: '🐢' },
          { value: 'no',     label: 'Not really right now',        icon: '🔄' },
        ] as { value: DestinationGoalCheckInStatus; label: string; icon: string }[]).map(opt => (
          <button
            key={opt.value}
            onClick={() => setGoalStatus(opt.value)}
            className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
              goalStatus === opt.value
                ? 'bg-emerald-950 border-emerald-500 ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-950'
                : 'bg-slate-900 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{opt.icon}</span>
              <p className={`font-semibold text-sm ${goalStatus === opt.value ? 'text-white' : 'text-slate-300'}`}>{opt.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Share with Grooving Circle toggle */}
      {answer.trim() && (
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            role="checkbox"
            aria-checked={shareCircle}
            onClick={() => setShareCircle(v => !v)}
            className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${
              shareCircle ? 'bg-violet-600' : 'bg-slate-700'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${shareCircle ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <span className="text-slate-400 text-xs leading-snug">
            Share one sentence from my reflection with my Grooving Circle
          </span>
        </label>
      )}

      <button
        onClick={() => submitAll(goalStatus)}
        disabled={!goalStatus || isPending}
        className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-white transition-colors"
      >
        {isPending ? 'Saving…' : 'Done →'}
      </button>
    </div>
  )
}
