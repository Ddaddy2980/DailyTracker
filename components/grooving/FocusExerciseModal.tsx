'use client'

// FocusExerciseModal
//
// Full-screen overlay used when the user launches the 25/5 exercise
// from the Grooving dashboard (standalone entry point).
// Handles calling saveFocusExercise so GroovingDash stays lean.

import { useState, useTransition } from 'react'
import { saveFocusExercise, markVideoWatched } from '@/app/actions'
import { VIDEO_LIBRARY } from '@/lib/constants'
import VideoCard from '@/components/challenge/VideoCard'
import FocusExercise from './FocusExercise'
import type { FocusTop5Item } from '@/lib/types'

interface Props {
  onSaved:         (top5: FocusTop5Item[]) => void
  onClose:         () => void
  watchedVideoIds: string[]
}

export default function FocusExerciseModal({ onSaved, onClose, watchedVideoIds }: Props) {
  const [isPending, startTransition]       = useTransition()
  const [watched, setWatched]              = useState<Set<string>>(new Set(watchedVideoIds))
  const [, startVideoTransition]           = useTransition()

  function handleVideoWatched(videoId: string) {
    setWatched(prev => new Set([...prev, videoId]))
    startVideoTransition(async () => {
      await markVideoWatched(videoId, 'focus_exercise_screen')
    })
  }

  const g2 = VIDEO_LIBRARY.find(v => v.id === 'G2')

  function handleComplete(data: { focusList25: string[]; focusTop5: FocusTop5Item[] }) {
    startTransition(async () => {
      await saveFocusExercise({ focusList25: data.focusList25, focusTop5: data.focusTop5 })
      onSaved(data.focusTop5)
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 pb-12">

        {/* Header bar */}
        <div className="flex items-center justify-between pt-6 pb-2">
          <p className="text-xs font-black uppercase tracking-widest text-violet-400">
            25/5 Focus Exercise
          </p>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Close
          </button>
        </div>

        {/* G2 — 25/5 exercise coaching, disappears once watched */}
        {g2 && !watched.has('G2') && (
          <div className="mt-4">
            <VideoCard video={g2} watched={false} onWatched={handleVideoWatched} />
          </div>
        )}

        <FocusExercise
          onComplete={handleComplete}
          onSkip={onClose}
          isPending={isPending}
        />

      </div>
    </div>
  )
}
