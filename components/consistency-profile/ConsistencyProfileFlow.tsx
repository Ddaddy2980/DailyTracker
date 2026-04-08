'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { PillarName } from '@/lib/types'
import { CONSISTENCY_PROFILE_QUESTIONS } from '@/lib/constants/consistencyProfileQuestions'
import { saveConsistencyProfile } from '@/app/actions'

interface Props {
  userId: string
}

const PILLAR_COLORS: Record<
  PillarName,
  {
    text: string
    progress: string
    selectedBorder: string
    selectedBg: string
    hoverBorder: string
    hoverBg: string
  }
> = {
  spiritual: {
    text: 'text-purple-600',
    progress: 'bg-purple-600',
    selectedBorder: 'border-purple-600',
    selectedBg: 'bg-purple-50',
    hoverBorder: 'hover:border-purple-600',
    hoverBg: 'hover:bg-purple-50',
  },
  physical: {
    text: 'text-emerald-600',
    progress: 'bg-emerald-600',
    selectedBorder: 'border-emerald-600',
    selectedBg: 'bg-emerald-50',
    hoverBorder: 'hover:border-emerald-600',
    hoverBg: 'hover:bg-emerald-50',
  },
  nutritional: {
    text: 'text-amber-500',
    progress: 'bg-amber-500',
    selectedBorder: 'border-amber-500',
    selectedBg: 'bg-amber-50',
    hoverBorder: 'hover:border-amber-500',
    hoverBg: 'hover:bg-amber-50',
  },
  personal: {
    text: 'text-blue-600',
    progress: 'bg-blue-600',
    selectedBorder: 'border-blue-600',
    selectedBg: 'bg-blue-50',
    hoverBorder: 'hover:border-blue-600',
    hoverBg: 'hover:bg-blue-50',
  },
  missional: {
    text: 'text-teal-600',
    progress: 'bg-teal-600',
    selectedBorder: 'border-teal-600',
    selectedBg: 'bg-teal-50',
    hoverBorder: 'hover:border-teal-600',
    hoverBg: 'hover:bg-teal-50',
  },
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const

export default function ConsistencyProfileFlow({ userId: _userId }: Props) {
  const router = useRouter()

  const [currentPillar, setCurrentPillar] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [scores, setScores] = useState<Record<PillarName, number>>({
    spiritual: 0,
    physical: 0,
    nutritional: 0,
    personal: 0,
    missional: 0,
  })
  const [isComplete, setIsComplete] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showingTransition, setShowingTransition] = useState(false)
  const [transitionPillarIndex, setTransitionPillarIndex] = useState(0)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  const pillarData = CONSISTENCY_PROFILE_QUESTIONS[currentPillar]
  const question = pillarData.questions[currentQuestion]
  const isLastQuestion = currentQuestion === 3
  const isLastPillar = currentPillar === 4
  const isFirstQuestion = currentPillar === 0 && currentQuestion === 0
  const progress = (((currentPillar * 4) + currentQuestion + 1) / 20) * 100
  const colors = PILLAR_COLORS[pillarData.pillar]

  const doSave = useCallback(async () => {
    setSaveStatus('saving')
    const result = await saveConsistencyProfile({ ...scores, focusPillarSelected: null })
    if (result.success) {
      router.push('/consistency-profile/portrait')
    } else {
      setSaveStatus('error')
    }
  }, [scores, router])

  useEffect(() => {
    if (!isComplete) return
    void doSave()
  }, [isComplete, doSave])

  function handleAnswer(points: number) {
    const pillar = pillarData.pillar
    setScores((prev) => ({ ...prev, [pillar]: prev[pillar] + points }))

    if (!isLastQuestion) {
      setCurrentQuestion((q) => q + 1)
    } else if (!isLastPillar) {
      const nextPillarIndex = currentPillar + 1
      setTransitionPillarIndex(nextPillarIndex)
      setShowingTransition(true)
      setTimeout(() => {
        setCurrentPillar(nextPillarIndex)
        setCurrentQuestion(0)
        setShowingTransition(false)
      }, 1000)
    } else {
      setIsComplete(true)
    }
  }

  function handleOptionClick(i: number) {
    if (selectedAnswer !== null) return
    setSelectedAnswer(i)
    setTimeout(() => {
      setSelectedAnswer(null)
      handleAnswer(i)
    }, 300)
  }

  if (isComplete) {
    if (saveStatus === 'error') {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-gray-700 text-center">
            Something went wrong saving your profile.
          </p>
          <button
            onClick={() => void doSave()}
            className="px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium"
          >
            Try again
          </button>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500 text-sm">Saving your profile...</p>
      </div>
    )
  }

  if (showingTransition) {
    const completedPillarData = CONSISTENCY_PROFILE_QUESTIONS[transitionPillarIndex - 1]
    const nextPillarData = CONSISTENCY_PROFILE_QUESTIONS[transitionPillarIndex]
    const nextColors = PILLAR_COLORS[nextPillarData.pillar]
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-base text-gray-500">
          {completedPillarData.emoji} {completedPillarData.label} — complete.
        </p>
        <p className={`text-xl font-medium ${nextColors.text}`}>
          Moving to {nextPillarData.label}. {nextPillarData.emoji}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-6 py-10">

        {/* App name */}
        <p className="text-xs text-gray-400 font-medium tracking-wide mb-6">
          Daily Consistency Tracker
        </p>

        {/* Opening framing — first question only */}
        {isFirstQuestion && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Your Consistency Profile
            </h1>
            <p className="text-base text-gray-600 mb-1">
              Before we set anything up, let&apos;s look at where you already are.
            </p>
            <p className="text-sm text-gray-500">
              This takes about 3–4 minutes. There are no right or wrong answers — only honest ones.
            </p>
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${colors.progress}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question counter */}
        {(() => {
          const qNum = (currentPillar * 4) + currentQuestion + 1
          const phrase =
            qNum === 20 ? 'Last one.' :
            qNum >= 16  ? 'Almost done.' :
            qNum >= 11  ? "You're getting closer." :
            qNum >= 6   ? 'Halfway there — keep going.' :
                          'Getting started…'
          return (
            <div className="mb-4">
              <p className="text-xs text-gray-400">{qNum} of 20</p>
              <p className="text-xs text-gray-400 italic">{phrase}</p>
            </div>
          )
        })()}

        {/* Pillar indicator */}
        <p className={`text-sm font-medium mb-4 ${colors.text}`}>
          {pillarData.emoji} {pillarData.label}
        </p>

        {/* Question card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
            {question.dimension}
          </p>
          <p className="text-lg font-medium text-gray-800 leading-snug mb-6">
            {question.subText}
          </p>

          {/* Answer buttons */}
          <div className="flex flex-col gap-3">
            {question.options.map((option, i) => {
              const isSelected = selectedAnswer === i
              return (
                <button
                  key={i}
                  onClick={() => handleOptionClick(i)}
                  disabled={selectedAnswer !== null}
                  className={[
                    'w-full text-left px-5 py-4 rounded-xl border text-sm transition-colors',
                    isSelected
                      ? `border-2 ${colors.selectedBorder} ${colors.selectedBg} text-gray-800 font-medium`
                      : `border-gray-200 bg-white text-gray-700 ${colors.hoverBorder} ${colors.hoverBg}`,
                  ].join(' ')}
                >
                  <span className="text-gray-400 mr-2">{OPTION_LETTERS[i]})</span>
                  {option}
                </button>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
