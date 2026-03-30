'use client'

// =============================================================================
// GroovingVideoSection — Step 27, Part E
//
// Surfaces G-module coaching videos for the Grooving level dashboard.
// Currently surfaces G1 (return-from-pause coaching) when the challenge has
// been resumed — same mechanism as VideoSection (Tuning) and JammingVideoSection.
//
// The video appears once after a resume and disappears after it's been watched.
// =============================================================================

import { useState, useTransition } from 'react'
import { markVideoWatched } from '@/app/actions'
import { VIDEO_LIBRARY, getGroovingReturnVideoId } from '@/lib/constants'
import type { ChallengePause } from '@/lib/types'
import VideoCard from '@/components/challenge/VideoCard'

interface Props {
  pauseRecord:     ChallengePause | null
  watchedVideoIds: string[]
}

export default function GroovingVideoSection({ pauseRecord, watchedVideoIds }: Props) {
  const [watched, setWatched]    = useState<Set<string>>(new Set(watchedVideoIds))
  const [, startTransition]      = useTransition()

  function handleWatched(videoId: string) {
    setWatched(prev => new Set([...prev, videoId]))
    startTransition(async () => {
      await markVideoWatched(videoId, 'grooving_pause_return')
    })
  }

  // Determine which G-module videos to surface and filter out already-watched ones
  const surfacedIds  = getGroovingReturnVideoId(pauseRecord)
  const surfacedVids = surfacedIds
    .filter(id => !watched.has(id))
    .map(id => VIDEO_LIBRARY.find(v => v.id === id))
    .filter((v): v is NonNullable<typeof v> => Boolean(v))

  if (surfacedVids.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        For your return
      </p>
      <div className="space-y-3">
        {surfacedVids.map(v => (
          <VideoCard
            key={v.id}
            video={v}
            watched={watched.has(v.id)}
            onWatched={handleWatched}
          />
        ))}
      </div>
    </div>
  )
}
