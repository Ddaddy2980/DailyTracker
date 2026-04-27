'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PILLAR_ORDER } from '@/lib/constants'
import { CONSISTENCY_PROFILE_QUESTIONS } from '@/lib/constants/consistencyProfileQuestions'
import type { PillarName } from '@/lib/types'
import ProfilePillarSection from '@/components/onboarding/ProfilePillarSection'

type PillarAnswers = Record<PillarName, (number | null)[]>

function initAnswers(): PillarAnswers {
  const empty: (number | null)[] = [null, null, null, null]
  return {
    spiritual:   [...empty],
    physical:    [...empty],
    nutritional: [...empty],
    personal:    [...empty],
    relational:  [...empty],
  }
}

interface ProfileFlowProps {
  isRetake?: boolean
}

export default function ProfileFlow({ isRetake = false }: ProfileFlowProps) {
  const router = useRouter()
  const [currentPillar, setCurrentPillar] = useState(0)
  const [answers, setAnswers] = useState<PillarAnswers>(initAnswers)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const pillarQ = CONSISTENCY_PROFILE_QUESTIONS[currentPillar]
  const pillarName = pillarQ.pillar
  const currentAnswers = answers[pillarName]
  const isLastPillar = currentPillar === CONSISTENCY_PROFILE_QUESTIONS.length - 1
  const allAnswered = currentAnswers.every((a) => a !== null)

  function handleAnswerChange(qIdx: number, value: number) {
    setAnswers((prev) => {
      const updated = [...prev[pillarName]] as (number | null)[]
      updated[qIdx] = value
      return { ...prev, [pillarName]: updated }
    })
  }

  function handlePrevious() {
    if (currentPillar > 0) setCurrentPillar((p) => p - 1)
  }

  async function handleNext() {
    if (!allAnswered) return

    if (!isLastPillar) {
      setCurrentPillar((p) => p + 1)
      return
    }

    // Final pillar — calculate scores and submit
    setSaving(true)
    setSubmitError(null)

    const scores = PILLAR_ORDER.reduce<Record<PillarName, number>>(
      (acc, pillar) => {
        const pillarAnswers = answers[pillar]
        acc[pillar] = pillarAnswers.reduce<number>((sum, a) => sum + (a ?? 0), 0)
        return acc
      },
      {} as Record<PillarName, number>
    )

    try {
      const res = await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores }),
      })

      if (!res.ok) {
        setSubmitError('Something went wrong saving your profile. Please try again.')
        return
      }

      // Retake: go back to dashboard. Normal onboarding: continue to goals.
      router.push(isRetake ? '/dashboard' : '/onboarding/goals')
    } catch {
      setSubmitError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-lg mt-6">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Pillar {currentPillar + 1} of {CONSISTENCY_PROFILE_QUESTIONS.length}
        </p>
        <div className="flex gap-1.5">
          {CONSISTENCY_PROFILE_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={[
                'w-2 h-2 rounded-full',
                i < currentPillar
                  ? 'bg-slate-700'
                  : i === currentPillar
                  ? 'bg-slate-900'
                  : 'bg-slate-300',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      <ProfilePillarSection
        pillarQ={pillarQ}
        answers={currentAnswers}
        onChange={handleAnswerChange}
      />

      {/* Navigation */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={handlePrevious}
          disabled={currentPillar === 0}
          className={[
            'flex-1 py-3 rounded-xl font-semibold text-sm border transition-colors',
            currentPillar === 0
              ? 'border-slate-200 text-slate-300 cursor-not-allowed'
              : 'border-slate-300 text-slate-700 hover:bg-slate-50',
          ].join(' ')}
        >
          Previous
        </button>

        <button
          onClick={handleNext}
          disabled={!allAnswered || saving}
          className={[
            'flex-1 py-3 rounded-xl font-semibold text-sm transition-colors',
            allAnswered && !saving
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed',
          ].join(' ')}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving…
            </span>
          ) : isLastPillar ? (
            'See My Profile →'
          ) : (
            'Next Pillar →'
          )}
        </button>
      </div>

      {submitError && (
        <p className="text-red-600 text-sm text-center mt-4">{submitError}</p>
      )}
    </div>
  )
}
