'use client'

// =============================================================================
// SoloingVideoSection — Step 54
//
// Surfaces S-module coaching videos inline in the today tab for Soloing.
// Only two cards appear inline — the rest live in the Videos library tab.
//
//   S1 — Day 1 welcome: surfaces once on the first day of the Soloing challenge.
//   S6 — Streak break: surfaces once when a 21+ day streak is broken by a miss.
//
// Both cards disappear after the user marks them watched (watchedVideoIds guard).
// =============================================================================

import { useState, useTransition } from 'react'
import { markVideoWatched } from '@/app/actions'
import { VIDEO_LIBRARY } from '@/lib/constants'
import type { VideoEntry } from '@/lib/types'
import VideoCard from '@/components/challenge/VideoCard'

interface Props {
  dayNumber:           number
  streakBrokenAfter21: boolean
  watchedVideoIds:     string[]
}

export default function SoloingVideoSection({ dayNumber, streakBrokenAfter21, watchedVideoIds }: Props) {
  const [watched, setWatched] = useState<Set<string>>(new Set(watchedVideoIds))
  const [, startTransition]   = useTransition()

  function handleWatched(videoId: string) {
    setWatched(prev => new Set([...prev, videoId]))
    startTransition(async () => {
      await markVideoWatched(videoId, 'soloing_inline')
    })
  }

  // Determine which inline cards to surface
  const surfaceIds: string[] = []
  if (dayNumber === 1)         surfaceIds.push('S1')
  if (streakBrokenAfter21)    surfaceIds.push('S6')

  const surfacedVids = surfaceIds
    .filter(id => !watched.has(id))
    .map(id => VIDEO_LIBRARY.find(v => v.id === id))
    .filter((v): v is VideoEntry => Boolean(v))

  if (surfacedVids.length === 0) return null

  const sectionLabel = surfaceIds.includes('S6') && !watched.has('S6')
    ? 'A word for today'
    : "Today's coaching"

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        {sectionLabel}
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
