'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PILLAR_CONFIG, LEVEL_NAMES, CHALLENGE_DURATIONS, fmtDate } from '@/lib/constants'
import type { PillarName, LevelNumber, ChallengeDuration } from '@/lib/types'

export interface PillarStat {
  pillar:        PillarName
  level:         LevelNumber
  completionPct: number
}

export interface CompletionScreenProps {
  challengeDurationDays: number
  startDate:             string   // YYYY-MM-DD
  completedAt:           string   // YYYY-MM-DD
  overallPct:            number   // 0–100
  pillarStats:           PillarStat[]
}

function PillarStatRow({ pillar, level, completionPct }: PillarStat) {
  const config = PILLAR_CONFIG[pillar]

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        backgroundColor: config.background,
        backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)',
        boxShadow: '0 4px 0 rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)',
      }}
    >
      <Image
        src={config.icon}
        alt={config.label}
        width={28}
        height={28}
        className="flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight" style={{ color: config.title }}>
          {config.label}
        </p>
        <p className="text-xs" style={{ color: config.subtitle }}>
          {LEVEL_NAMES[level]}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-lg font-bold leading-tight" style={{ color: config.title }}>
          {completionPct}%
        </p>
        <p className="text-xs" style={{ color: config.subtitle }}>
          consistent
        </p>
      </div>
    </div>
  )
}

export default function CompletionScreen({
  challengeDurationDays,
  startDate,
  completedAt,
  overallPct,
  pillarStats,
}: CompletionScreenProps) {
  const router = useRouter()

  // Step 1 of restart: choose restart type
  // Step 2: pick a new duration
  // Step 3: confirming (loading)
  type RestartStep = 'idle' | 'choose-type' | 'choose-duration' | 'saving'
  const [step, setStep]               = useState<RestartStep>('idle')
  const [retakeProfile, setRetakeProfile] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState<ChallengeDuration>(
    // Default to closest preset ≥ challenge duration (or last preset)
    CHALLENGE_DURATIONS.find((d) => d >= challengeDurationDays) ?? 100
  )
  const [error, setError] = useState('')

  async function handleRestart() {
    setStep('saving')
    setError('')
    try {
      const res = await fetch('/api/challenges/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retakeProfile, durationDays: selectedDuration }),
      })
      const data: { redirectTo?: string; error?: string } = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Try again.')
        setStep('choose-duration')
        return
      }
      router.push(data.redirectTo ?? '/dashboard')
    } catch {
      setError('Network error. Please try again.')
      setStep('choose-duration')
    }
  }

  return (
    <div className="min-h-screen bg-[#EBEBEC] px-4 pt-6 pb-24">
      {/* Celebration header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">You did it.</h1>
        <p className="text-base text-slate-500 leading-relaxed max-w-xs mx-auto">
          {challengeDurationDays} days of showing up for the life you want to live.
        </p>
      </div>

      {/* Challenge summary card */}
      <div className="bg-white rounded-2xl px-5 py-5 mb-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Challenge Summary
        </p>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-slate-800">{challengeDurationDays} Days</p>
            <p className="text-sm text-slate-400">
              {fmtDate(startDate)} – {fmtDate(completedAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-emerald-600">{overallPct}%</p>
            <p className="text-xs text-slate-400">overall consistency</p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Per-pillar stats */}
      {pillarStats.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">
            Your Pillars
          </p>
          {pillarStats.map((stat) => (
            <PillarStatRow key={stat.pillar} {...stat} />
          ))}
        </div>
      )}

      {/* CTAs */}
      <div className="space-y-3">
        {/* ── IDLE: initial CTA ── */}
        {step === 'idle' && (
          <button
            type="button"
            onClick={() => setStep('choose-type')}
            className="w-full py-4 rounded-2xl bg-slate-800 text-white font-semibold text-base shadow-[0_5px_0_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 transition-all duration-75"
          >
            Start a New Challenge
          </button>
        )}

        {/* ── CHOOSE TYPE ── */}
        {step === 'choose-type' && (
          <div className="bg-white rounded-2xl px-5 py-5 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-slate-700 text-center">
              How would you like to start?
            </p>

            {/* Carry forward option */}
            <button
              type="button"
              onClick={() => { setRetakeProfile(false); setStep('choose-duration') }}
              className="w-full text-left px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-400 transition-colors"
            >
              <p className="font-semibold text-slate-800 text-sm">Keep my current profile</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Your pillar levels carry forward. Jump straight back into the challenge.
              </p>
            </button>

            {/* Retake profile option */}
            <button
              type="button"
              onClick={() => { setRetakeProfile(true); setStep('choose-duration') }}
              className="w-full text-left px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-400 transition-colors"
            >
              <p className="font-semibold text-slate-800 text-sm">Retake the Consistency Profile</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Reassess your pillar levels and start fresh from your new scores.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStep('idle')}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── CHOOSE DURATION ── */}
        {step === 'choose-duration' && (
          <div className="bg-white rounded-2xl px-5 py-5 shadow-sm space-y-4">
            <p className="text-sm font-semibold text-slate-700 text-center">
              Choose your challenge length
            </p>

            <div className="grid grid-cols-3 gap-2">
              {CHALLENGE_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDuration(d)}
                  className={[
                    'py-3 rounded-xl font-semibold text-sm transition-all',
                    selectedDuration === d
                      ? 'bg-slate-800 text-white shadow-[0_3px_0_rgba(0,0,0,0.25)]'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  ].join(' ')}
                >
                  {d} days
                </button>
              ))}
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              type="button"
              onClick={handleRestart}
              className="w-full py-4 rounded-2xl bg-slate-800 text-white font-semibold text-base shadow-[0_5px_0_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 transition-all duration-75"
            >
              {retakeProfile ? 'Start & Retake Profile →' : 'Start Challenge →'}
            </button>

            <button
              type="button"
              onClick={() => setStep('choose-type')}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
            >
              Back
            </button>
          </div>
        )}

        {/* ── SAVING ── */}
        {step === 'saving' && (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-slate-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="ml-3 text-sm text-slate-500">Starting your new challenge…</span>
          </div>
        )}
      </div>
    </div>
  )
}
