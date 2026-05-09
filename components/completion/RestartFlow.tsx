'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CHALLENGE_DURATIONS } from '@/lib/constants'
import type { ChallengeDuration } from '@/lib/types'
import Spinner from '@/components/ui/Spinner'

interface RestartFlowProps {
  challengeDurationDays: number
}

export default function RestartFlow({ challengeDurationDays }: RestartFlowProps) {
  const router = useRouter()

  type RestartStep = 'idle' | 'choose-type' | 'choose-duration' | 'saving'
  const [step, setStep]                         = useState<RestartStep>('idle')
  const [retakeProfile, setRetakeProfile]       = useState(false)
  const [selectedDuration, setSelectedDuration] = useState<ChallengeDuration>(
    CHALLENGE_DURATIONS.find((d) => d >= challengeDurationDays) ?? 100,
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
          <Spinner className="h-6 w-6 text-slate-500" />
          <span className="ml-3 text-sm text-slate-500">Starting your new challenge…</span>
        </div>
      )}
    </div>
  )
}
