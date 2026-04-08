'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PillarName, PillarLevel } from '@/lib/types'
import { saveFocusPillar } from '@/app/actions'

interface Props {
  pillarLevels: PillarLevel[]
  userId: string
}

const PILLAR_ORDER: PillarName[] = ['spiritual', 'physical', 'nutritional', 'personal', 'missional']

const PILLAR_META: Record<PillarName, {
  emoji: string; label: string; text: string
  border: string; bg: string; button: string
}> = {
  spiritual:   { emoji: '🙏', label: 'Spiritual',   text: 'text-purple-600',  border: 'border-purple-600',  bg: 'bg-purple-50',  button: 'bg-purple-600'  },
  physical:    { emoji: '💪', label: 'Physical',    text: 'text-emerald-600', border: 'border-emerald-600', bg: 'bg-emerald-50', button: 'bg-emerald-600' },
  nutritional: { emoji: '🥗', label: 'Nutritional', text: 'text-amber-500',   border: 'border-amber-500',   bg: 'bg-amber-50',   button: 'bg-amber-500'   },
  personal:    { emoji: '📝', label: 'Personal',    text: 'text-blue-600',    border: 'border-blue-600',    bg: 'bg-blue-50',    button: 'bg-blue-600'    },
  missional:   { emoji: '🤝', label: 'Missional',   text: 'text-teal-600',    border: 'border-teal-600',    bg: 'bg-teal-50',    button: 'bg-teal-600'    },
}

const LEVEL_NAMES: Record<number, string> = {
  1: 'Tuning', 2: 'Jamming', 3: 'Grooving', 4: 'Soloing',
}

function getStatusPhrase(pillar: PillarName, level: number): string {
  if (level === 4) return 'Rooted & Running'
  if (level === 3) return 'Building Momentum'
  if (level === 2) return 'Finding Your Rhythm'
  if (pillar === 'missional') return 'Ready to Flow'
  return 'Starting Fresh'
}

function labelList(pillars: PillarName[]): string {
  const labels = pillars.map((p) => PILLAR_META[p].label)
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

export default function PillarPortrait({ pillarLevels, userId: _userId }: Props) {
  const router = useRouter()
  const [focusPillar, setFocusPillar] = useState<PillarName | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  const levelMap = Object.fromEntries(
    pillarLevels.map((pl) => [pl.pillar, pl])
  ) as Partial<Record<PillarName, PillarLevel>>

  const strongPillars     = PILLAR_ORDER.filter((p) => (levelMap[p]?.level ?? 0) >= 3)
  const developingPillars = PILLAR_ORDER.filter((p) => (levelMap[p]?.level ?? 0) <= 2)

  const spiritualScore = levelMap.spiritual?.profile_score ?? 0
  const lowestScore    = Math.min(...PILLAR_ORDER.map((p) => levelMap[p]?.profile_score ?? 0))
  const showSpiritualNote = spiritualScore <= lowestScore && strongPillars.some((p) => p !== 'spiritual')

  async function handleContinue() {
    if (!focusPillar) return
    setSaveStatus('saving')
    const result = await saveFocusPillar(focusPillar)
    if (result.success) {
      router.push('/onboarding')
    } else {
      setSaveStatus('error')
    }
  }

  const selectedMeta = focusPillar ? PILLAR_META[focusPillar] : null

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-6 py-10">

        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Pillar Portrait</h1>
        <p className="text-sm text-gray-500 mb-8">Here is where you are starting.</p>

        {/* Pillar cards */}
        <div className="flex flex-col gap-3 mb-8">
          {PILLAR_ORDER.map((pillar) => {
            const level = levelMap[pillar]?.level ?? 1
            const meta = PILLAR_META[pillar]
            const isSelected = focusPillar === pillar
            return (
              <button
                key={pillar}
                onClick={() => setFocusPillar(pillar)}
                className={[
                  'w-full text-left px-5 py-4 rounded-xl border-2 bg-white transition-colors',
                  isSelected ? `${meta.border} ${meta.bg}` : 'border-gray-100',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${meta.text}`}>
                    {meta.emoji} {meta.label}
                  </span>
                  <span className="text-xs text-gray-400">{LEVEL_NAMES[level]}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{getStatusPhrase(pillar, level)}</p>
              </button>
            )
          })}
        </div>

        {/* Personalized statement */}
        <div className="flex flex-col gap-3 mb-8">
          {strongPillars.length > 0 && (
            <p className="text-sm text-gray-700 leading-relaxed">
              You&apos;ve built something real in <strong>{labelList(strongPillars)}</strong>. That
              foundation matters — and we&apos;re going to build on it, not ignore it.
            </p>
          )}
          {developingPillars.length > 0 && (
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>{labelList(developingPillars)}</strong>{' '}
              {developingPillars.length === 1 ? 'is' : 'are'} your active growth{' '}
              {developingPillars.length === 1 ? 'area' : 'areas'}. That&apos;s where your first
              challenge will invest the most energy.
            </p>
          )}
          {showSpiritualNote && (
            <p className="text-sm text-gray-600 leading-relaxed italic">
              The Spiritual pillar tends to be the one that holds everything else together. Even a
              small daily practice here can change what the other habits feel like.
            </p>
          )}
        </div>

        {/* Agency question */}
        <p className="text-base font-medium text-gray-800 mb-6">
          Which pillar do you most want to start with? You can always add others as you go.
        </p>

        {saveStatus === 'error' && (
          <p className="text-sm text-red-600 mb-3">Something went wrong. Please try again.</p>
        )}

        {focusPillar && selectedMeta && (
          <button
            onClick={() => void handleContinue()}
            disabled={saveStatus === 'saving'}
            className={[
              'w-full py-4 rounded-xl text-white text-sm font-medium transition-opacity',
              selectedMeta.button,
              saveStatus === 'saving' ? 'opacity-60' : '',
            ].join(' ')}
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Continue →'}
          </button>
        )}

      </div>
    </div>
  )
}
