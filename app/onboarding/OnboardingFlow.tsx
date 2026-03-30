'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createContinuousJourney, markVideoWatched } from '@/app/actions'
import { calculateJourneyPreview } from '@/lib/journeyEngine'
import { VIDEO_LIBRARY } from '@/lib/constants'
import VideoCard from '@/components/challenge/VideoCard'

// ── Constants ─────────────────────────────────────────────────────────────────

type PillarKey = 'spiritual' | 'physical' | 'nutritional' | 'personal'

const TOTAL_STEPS = 7
const PRESETS: number[] = [21, 30, 45, 60, 90, 100]
const PILLARS: PillarKey[] = ['spiritual', 'physical', 'nutritional', 'personal']

const PILLAR_CONFIG: Record<PillarKey, {
  label:       string
  description: string
  icon:        string
  color:       string
  border:      string
  bg:          string
}> = {
  spiritual:   { label: 'Spiritual',   description: 'Strengthen your connection to God through daily practice.', icon: '/Spiritual_Icon_Bk.png',   color: 'text-purple-700', border: 'border-purple-400', bg: 'bg-purple-50'  },
  physical:    { label: 'Physical',    description: 'Honor your body through intentional movement and rest.',     icon: '/Physical_Icon_Bk.png',    color: 'text-blue-700',   border: 'border-blue-400',   bg: 'bg-blue-50'    },
  nutritional: { label: 'Nutritional', description: 'Fuel your purpose through what you eat and drink.',          icon: '/Nutritional_Icon_Bk.png', color: 'text-amber-700',  border: 'border-amber-400',  bg: 'bg-amber-50'   },
  personal:    { label: 'Personal',    description: 'Sharpen your mind, emotions, and creative life.',            icon: '/Personal_Icon_Bk.png',    color: 'text-green-700',  border: 'border-green-400',  bg: 'bg-green-50'   },
}

const PILLAR_SUGGESTIONS: Record<PillarKey, string[]> = {
  spiritual:   [
    'Read one chapter of Scripture every day',
    'Spend 10 minutes in prayer each morning',
    'Write 5 minutes of spiritual reflection daily',
    'Complete one devotional reading before bed',
  ],
  physical:    [
    'Walk at least 10 minutes every day',
    'Complete 20 minutes of intentional exercise',
    'Hit a minimum of 5,000 steps',
    'Do 10 minutes of stretching or mobility work',
  ],
  nutritional: [
    'Drink at least 64oz of water every day',
    'Eat at least one serving of vegetables daily',
    'Eat a protein-rich breakfast at least 5 days per week',
    'Avoid processed sugar before noon',
  ],
  personal:    [
    'Read at least 10 pages of a current book every day',
    'Write one specific gratitude statement each day',
    'Spend 15 minutes on a chosen hobby',
    'Listen to one educational podcast episode daily',
  ],
}

const LEVEL_COLORS: Record<string, string> = {
  Tuning:   'bg-purple-100 text-purple-700 border-purple-300',
  Jamming:  'bg-blue-100 text-blue-700 border-blue-300',
  Grooving: 'bg-teal-100 text-teal-700 border-teal-300',
  Soloing:  'bg-amber-100 text-amber-700 border-amber-300',
}

const A1_VIDEO = VIDEO_LIBRARY.find(v => v.id === 'A1')!

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all ${
            i + 1 === step
              ? 'w-4 h-2 bg-[var(--pillar-spiritual-accent)]'
              : i + 1 < step
              ? 'w-2 h-2 bg-[var(--pillar-spiritual-accent)] opacity-60'
              : 'w-2 h-2 bg-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

function JourneyPreview({ totalDays }: { totalDays: number }) {
  const preview = calculateJourneyPreview(totalDays)
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
        Your journey
      </p>
      <div className="flex flex-wrap gap-1.5 items-center">
        {preview.map((lvl, i) => (
          <span key={lvl.level} className="flex items-center gap-1">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              LEVEL_COLORS[lvl.name] ?? 'bg-gray-100 text-gray-600 border-gray-300'
            }`}>
              {lvl.name} · Days {lvl.days}
            </span>
            {i < preview.length - 1 && (
              <span className="text-[var(--text-muted)] text-xs">→</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingFlow() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [step, setStep]                       = useState(1)
  const [name, setName]                       = useState('')
  const [totalDays, setTotalDays]             = useState<number | null>(null)
  const [customDaysStr, setCustomDaysStr]     = useState('')
  const [showCustom, setShowCustom]           = useState(false)
  const [selectedPillars, setSelectedPillars] = useState<PillarKey[]>([])
  const [pillarGoals, setPillarGoals]         = useState<Record<string, string>>({})
  const [actChecks, setActChecks]             = useState<Record<string, boolean | null>>({})
  const [videoWatched, setVideoWatched]       = useState(false)
  const [submitError, setSubmitError]         = useState<string | null>(null)

  // ── Derived ───────────────────────────────────────────────────────────────

  const nameValid       = name.trim().length >= 2 && name.trim().length <= 30
  const goalsValid      = selectedPillars.every(p => (pillarGoals[p] ?? '').trim().length > 0)
  const customDaysNum   = parseInt(customDaysStr, 10)
  const customDaysValid = !isNaN(customDaysNum) && customDaysNum >= 8 && customDaysNum <= 100

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handlePresetSelect(days: number) {
    setTotalDays(days)
    setShowCustom(false)
    setCustomDaysStr('')
  }

  function handleCustomChange(val: string) {
    setCustomDaysStr(val)
    const n = parseInt(val, 10)
    setTotalDays(!isNaN(n) && n >= 8 && n <= 100 ? n : null)
  }

  function handlePillarToggle(pillar: PillarKey) {
    setSelectedPillars(prev => {
      if (prev.includes(pillar)) return prev.filter(p => p !== pillar)
      if (prev.length >= 2)      return [prev[1], pillar]
      return [...prev, pillar]
    })
  }

  function handleSuggestion(pillar: string, suggestion: string) {
    setPillarGoals(prev => ({ ...prev, [pillar]: suggestion }))
    setActChecks(prev => ({ ...prev, [pillar]: null }))
  }

  function handleGoalChange(pillar: string, value: string) {
    setPillarGoals(prev => ({ ...prev, [pillar]: value }))
    setActChecks(prev => ({ ...prev, [pillar]: null }))
  }

  function handleActCheck(pillar: string, answer: boolean) {
    setActChecks(prev => ({ ...prev, [pillar]: answer }))
  }

  function handleVideoWatched() {
    setVideoWatched(true)
    startTransition(async () => {
      await markVideoWatched('A1', 'onboarding')
    })
    setStep(4)
  }

  function handleSubmit() {
    if (!totalDays || !goalsValid || !name.trim()) return
    setSubmitError(null)
    startTransition(async () => {
      try {
        await createContinuousJourney({
          name:            name.trim(),
          totalDays,
          selectedPillars: selectedPillars as string[],
          pillarGoals,
        })
        router.push('/journey')
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  // ── Screen 1 — Welcome ────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
        style={{ backgroundColor: 'var(--app-bg)' }}
      >
        <div className="w-full max-w-sm space-y-8">

          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[var(--pillar-spiritual-bg)] flex items-center justify-center">
              <span className="text-white text-xl font-bold">AL</span>
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-black text-[var(--text-primary)]">Daily Consistency Tracker</h1>
              <p className="text-base font-semibold text-purple-600">Living ON Purpose starts here.</p>
            </div>
          </div>

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed text-center">
            Most people know their life should matter. Few have a daily plan to make it happen.
            This app builds that plan — one consistent day at a time.
          </p>

          <button
            onClick={() => setStep(2)}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black text-lg text-white transition-colors"
          >
            Begin my journey →
          </button>

        </div>
      </div>
    )
  }

  // ── Screen 2 — Your name ──────────────────────────────────────────────────

  if (step === 2) {
    return (
      <div className="min-h-screen px-5 py-10" style={{ backgroundColor: 'var(--app-bg)' }}>
        <div className="max-w-sm mx-auto space-y-6">
          <ProgressDots step={step} />

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-[var(--text-primary)]">What should we call you?</h1>
            <p className="text-sm text-[var(--text-secondary)]">Used throughout the app and in coaching messages.</p>
          </div>

          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your first name or nickname"
            maxLength={30}
            autoFocus
            className="w-full px-4 py-3 border-2 border-[var(--card-border)] rounded-2xl text-[var(--text-primary)] bg-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-400 text-base"
          />

          <button
            onClick={() => setStep(3)}
            disabled={!nameValid}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-black text-lg text-white transition-colors"
          >
            Continue →
          </button>
        </div>
      </div>
    )
  }

  // ── Screen 3 — Intro video ────────────────────────────────────────────────

  if (step === 3) {
    return (
      <div className="min-h-screen px-5 py-10" style={{ backgroundColor: 'var(--app-bg)' }}>
        <div className="max-w-sm mx-auto space-y-6">
          <ProgressDots step={step} />

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Before you begin, watch this.</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              It takes 60 seconds and changes how you see every day.
            </p>
          </div>

          <VideoCard
            video={A1_VIDEO}
            watched={videoWatched}
            onWatched={handleVideoWatched}
          />

          <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
            This video explains the philosophy behind your journey.
          </p>

          <button
            onClick={() => setStep(4)}
            className="w-full text-center text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] py-2 transition-colors"
          >
            Skip for now →
          </button>
        </div>
      </div>
    )
  }

  // ── Screen 4 — Duration ───────────────────────────────────────────────────

  if (step === 4) {
    return (
      <div className="min-h-screen px-5 py-10" style={{ backgroundColor: 'var(--app-bg)' }}>
        <div className="max-w-sm mx-auto space-y-6">
          <ProgressDots step={step} />

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-[var(--text-primary)]">How long is your journey?</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Choose a duration that feels like a real commitment — not too easy, not impossible.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map(days => (
              <button
                key={days}
                onClick={() => handlePresetSelect(days)}
                className={`py-3 rounded-2xl border-2 font-black text-sm transition-all ${
                  totalDays === days && !showCustom
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-white border-[var(--card-border)] text-[var(--text-primary)] hover:border-purple-400'
                }`}
              >
                {days} days
              </button>
            ))}
          </div>

          {!showCustom ? (
            <button
              onClick={() => { setShowCustom(true); setTotalDays(null) }}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-[var(--card-border)] text-sm text-[var(--text-secondary)] hover:border-purple-400 hover:text-purple-600 transition-all"
            >
              Custom
            </button>
          ) : (
            <div className="space-y-1">
              <input
                type="number"
                value={customDaysStr}
                onChange={e => handleCustomChange(e.target.value)}
                placeholder="Enter days (8–100)"
                min={8}
                max={100}
                autoFocus
                className="w-full px-4 py-3 border-2 border-purple-400 rounded-2xl text-[var(--text-primary)] bg-white placeholder:text-[var(--text-muted)] focus:outline-none text-base"
              />
              {customDaysStr !== '' && !customDaysValid && (
                <p className="text-xs text-red-500 px-1">Enter a number between 8 and 100.</p>
              )}
            </div>
          )}

          {totalDays !== null && <JourneyPreview totalDays={totalDays} />}

          <button
            onClick={() => setStep(5)}
            disabled={totalDays === null}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-black text-lg text-white transition-colors"
          >
            This is my commitment →
          </button>
        </div>
      </div>
    )
  }

  // ── Screen 5 — Pillar selection ───────────────────────────────────────────

  if (step === 5) {
    return (
      <div className="min-h-screen px-5 py-10" style={{ backgroundColor: 'var(--app-bg)' }}>
        <div className="max-w-sm mx-auto space-y-6">
          <ProgressDots step={step} />

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Choose 2 pillars to begin.</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              You will build one goal in each. You can add more pillars as you progress.
            </p>
          </div>

          <div className="space-y-3">
            {PILLARS.map(pillar => {
              const cfg        = PILLAR_CONFIG[pillar]
              const isSelected = selectedPillars.includes(pillar)
              return (
                <button
                  key={pillar}
                  onClick={() => handlePillarToggle(pillar)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? `${cfg.bg} ${cfg.border}`
                      : 'bg-white border-[var(--card-border)] hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={cfg.icon}
                      alt={cfg.label}
                      width={40}
                      height={40}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black ${isSelected ? cfg.color : 'text-[var(--text-primary)]'}`}>
                        {cfg.label}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                        {cfg.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setStep(6)}
            disabled={selectedPillars.length !== 2}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-black text-lg text-white transition-colors"
          >
            These are my pillars →
          </button>
        </div>
      </div>
    )
  }

  // ── Screen 6 — Goals ──────────────────────────────────────────────────────

  if (step === 6) {
    return (
      <div className="min-h-screen px-5 py-10 pb-16" style={{ backgroundColor: 'var(--app-bg)' }}>
        <div className="max-w-sm mx-auto space-y-6">
          <ProgressDots step={step} />

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Set one goal for each pillar.</h1>
            <p className="text-sm text-[var(--text-secondary)]">Make it something you can do on your worst day.</p>
          </div>

          <div className="space-y-8">
            {selectedPillars.map(pillar => {
              const cfg       = PILLAR_CONFIG[pillar]
              const goal      = pillarGoals[pillar] ?? ''
              const actAnswer = actChecks[pillar] ?? null
              return (
                <div key={pillar} className="space-y-3">
                  <p className={`text-sm font-black uppercase tracking-wider ${cfg.color}`}>{cfg.label}</p>

                  <div className="flex flex-col gap-1.5">
                    {PILLAR_SUGGESTIONS[pillar].map(s => (
                      <button
                        key={s}
                        onClick={() => handleSuggestion(pillar, s)}
                        className={`text-left text-xs px-3 py-2 rounded-xl border transition-all ${
                          goal === s
                            ? `${cfg.bg} ${cfg.border} ${cfg.color} font-semibold`
                            : 'bg-gray-50 border-gray-200 text-[var(--text-secondary)] hover:border-gray-400'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={goal}
                    onChange={e => handleGoalChange(pillar, e.target.value)}
                    placeholder="Or write your own goal…"
                    className="w-full px-4 py-3 border-2 border-[var(--card-border)] rounded-2xl text-[var(--text-primary)] bg-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-400 text-sm"
                  />

                  {goal.trim().length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-[var(--text-secondary)]">
                        Can you do this on your absolute worst day?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleActCheck(pillar, true)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            actAnswer === true
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-white border-gray-300 text-[var(--text-secondary)] hover:border-emerald-400'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => handleActCheck(pillar, false)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            actAnswer === false
                              ? 'bg-red-100 border-red-400 text-red-700'
                              : 'bg-white border-gray-300 text-[var(--text-secondary)] hover:border-red-300'
                          }`}
                        >
                          No
                        </button>
                      </div>
                      {actAnswer === false && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
                          Consider making it smaller. The goal is consistency, not perfection.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            onClick={() => setStep(7)}
            disabled={!goalsValid}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-black text-lg text-white transition-colors"
          >
            These are my goals →
          </button>
        </div>
      </div>
    )
  }

  // ── Screen 7 — Confirmation ───────────────────────────────────────────────

  return (
    <div className="min-h-screen px-5 py-10 pb-16" style={{ backgroundColor: 'var(--app-bg)' }}>
      <div className="max-w-sm mx-auto space-y-6">
        <ProgressDots step={step} />

        <h1 className="text-2xl font-black text-[var(--text-primary)]">Your journey begins today.</h1>

        <div className="bg-white border border-[var(--card-border)] rounded-2xl p-5 space-y-4">

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Journeying as</p>
            <p className="text-lg font-black text-[var(--text-primary)] mt-0.5">{name.trim()}</p>
          </div>

          {totalDays !== null && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-2">
                {totalDays}-day journey
              </p>
              <JourneyPreview totalDays={totalDays} />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              Your pillars &amp; goals
            </p>
            {selectedPillars.map(pillar => {
              const cfg = PILLAR_CONFIG[pillar]
              return (
                <div key={pillar} className={`${cfg.bg} border ${cfg.border} rounded-xl p-3`}>
                  <p className={`text-[11px] font-black uppercase tracking-wider ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5 leading-snug">{pillarGoals[pillar]}</p>
                </div>
              )
            })}
          </div>

        </div>

        <div className="bg-slate-900 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">A word for you</p>
          <p className="text-white text-sm leading-relaxed italic mb-3">
            &ldquo;Let us not grow weary of doing good, for in due season we will reap, if we do not give up.&rdquo;
          </p>
          <p className="text-slate-400 text-sm font-semibold text-right">— Galatians 6:9</p>
        </div>

        {submitError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {submitError}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-2xl font-black text-lg text-white transition-colors"
        >
          {isPending ? 'Starting your journey…' : 'Start my journey →'}
        </button>

      </div>
    </div>
  )
}
