'use client'

import { useState, useEffect, useTransition } from 'react'
import { markVideoWatched } from '@/app/actions'
import { VIDEO_LIBRARY } from '@/lib/constants'
import VideoCard from '@/components/challenge/VideoCard'
import type { DestinationGoal, FocusTop5Item } from '@/lib/types'
import DestinationGoalSetup from './DestinationGoalSetup'

// ── Constants ─────────────────────────────────────────────────────────────────

const PILLAR_LABEL: Record<string, string> = {
  spiritual: 'Spiritual', physical: 'Physical',
  nutritional: 'Nutritional', personal: 'Personal',
}

const PILLAR_COLOR: Record<string, string> = {
  spiritual:   'text-[#4a90d9]',
  physical:    'text-[#6b8dd6]',
  nutritional: 'text-[#d4863a]',
  personal:    'text-[#5aab6e]',
}

const PILLAR_CARD: Record<string, string> = {
  spiritual:   'bg-blue-50 border-blue-200',
  physical:    'bg-indigo-50 border-indigo-200',
  nutritional: 'bg-orange-50 border-orange-200',
  personal:    'bg-green-50 border-green-200',
}

const STATUS_LABEL: Record<string, string> = {
  active:   'In progress',
  reached:  '✓ Reached',
  released: 'Released',
}

const STATUS_COLOR: Record<string, string> = {
  active:   'text-[var(--text-secondary)]',
  reached:  'text-emerald-600',
  released: 'text-[var(--text-muted)]',
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  rootedMilestoneFired: boolean
  destinationGoals:     DestinationGoal[]
  pillars:              string[]
  challengeId:          string
  focusTop5:            FocusTop5Item[] | null
  watchedVideoIds:      string[]
  forceOpenSetup?:      boolean
  onForceOpenHandled?:  () => void
  onGoalsUpdated:       () => void
}

export default function DestinationGoalLayer({
  rootedMilestoneFired, destinationGoals, pillars, challengeId,
  focusTop5, watchedVideoIds, forceOpenSetup, onForceOpenHandled, onGoalsUpdated,
}: Props) {
  const [showSetup, setShowSetup] = useState(false)
  const [watched, setWatched]     = useState<Set<string>>(new Set(watchedVideoIds))
  const [, startTransition]       = useTransition()

  function handleVideoWatched(videoId: string) {
    setWatched(prev => new Set([...prev, videoId]))
    startTransition(async () => {
      await markVideoWatched(videoId, 'post_rooted_destination')
    })
  }

  const g6 = VIDEO_LIBRARY.find(v => v.id === 'G6')

  useEffect(() => {
    if (forceOpenSetup) {
      setShowSetup(true)
      onForceOpenHandled?.()
    }
  }, [forceOpenSetup, onForceOpenHandled])

  if (!rootedMilestoneFired) return null

  const activeGoals = destinationGoals.filter(g => g.status === 'active')

  function handleSetupComplete() {
    setShowSetup(false)
    onGoalsUpdated()
  }

  return (
    <>
      {g6 && !watched.has('G6') && destinationGoals.length === 0 && (
        <VideoCard video={g6} watched={false} onWatched={handleVideoWatched} />
      )}

      {/* ── Prompt card: no goals set yet ───────────────────────────────────── */}
      {destinationGoals.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌱</span>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
              Rooted
            </p>
          </div>
          <p className="text-[var(--text-primary)] text-sm font-semibold leading-relaxed">
            You&apos;ve built real consistency. Where is it taking you?
          </p>
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
            Set a destination goal — not a daily task, but a direction.
            The kind of person you&apos;re becoming.
          </p>
          <button
            onClick={() => setShowSetup(true)}
            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold
              rounded-xl transition-colors active:scale-95"
          >
            Set my direction →
          </button>
        </div>
      )}

      {/* ── Direction cards: goals are set ──────────────────────────────────── */}
      {activeGoals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🌱</span>
              <p className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">
                Direction
              </p>
            </div>
            <button
              onClick={() => setShowSetup(true)}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Edit
            </button>
          </div>

          {activeGoals.map(goal => (
            <div
              key={goal.id}
              className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${PILLAR_CARD[goal.pillar] ?? 'bg-white border-[var(--card-border)]'}`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${PILLAR_COLOR[goal.pillar] ?? 'text-[var(--text-secondary)]'}`}>
                  {PILLAR_LABEL[goal.pillar] ?? goal.pillar}
                </p>
                <p className="text-[var(--text-primary)] text-sm leading-snug">{goal.goal_name}</p>
                {goal.target_date && (
                  <p className="text-[var(--text-secondary)] text-xs mt-1">
                    By{' '}
                    {new Date(goal.target_date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'long',
                      year:  'numeric',
                    })}
                  </p>
                )}
              </div>
              <span className={`text-xs font-bold flex-shrink-0 mt-0.5 ${STATUS_COLOR[goal.status] ?? 'text-[var(--text-secondary)]'}`}>
                {STATUS_LABEL[goal.status] ?? goal.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {showSetup && (
        <DestinationGoalSetup
          pillars={pillars}
          challengeId={challengeId}
          existingGoals={destinationGoals}
          focusTop5={focusTop5}
          onComplete={handleSetupComplete}
        />
      )}
    </>
  )
}
