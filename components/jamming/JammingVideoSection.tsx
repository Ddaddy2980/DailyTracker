'use client'

import { useState, useTransition } from 'react'
import { markVideoWatched } from '@/app/actions'
import { VIDEO_LIBRARY, getJammingVideoIds } from '@/lib/constants'
import type { PulseState } from '@/lib/types'
import VideoCard from '@/components/challenge/VideoCard'

interface Props {
  dayNumber:       number
  lastPulseState:  PulseState | null
  watchedVideoIds: string[]
}

export default function JammingVideoSection({ dayNumber, lastPulseState, watchedVideoIds }: Props) {
  const [watched, setWatched]     = useState<Set<string>>(new Set(watchedVideoIds))
  const [, startTransition]       = useTransition()
  const [libraryOpen, setLibrary] = useState(false)

  function handleWatched(videoId: string) {
    setWatched(prev => new Set([...prev, videoId]))
    startTransition(async () => {
      await markVideoWatched(videoId, `jamming_day_${dayNumber}`)
    })
  }

  const todayIds  = getJammingVideoIds(dayNumber, lastPulseState)
  const todayVids = todayIds
    .map(id => VIDEO_LIBRARY.find(v => v.id === id))
    .filter((v): v is NonNullable<typeof v> => Boolean(v))

  const libraryVids = VIDEO_LIBRARY.filter(v => v.module === 'J')

  return (
    <div className="space-y-6">

      {/* ── Today's Coaching ─────────────────────────────────────────────── */}
      {todayVids.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Today&apos;s Coaching
          </p>
          <div className="space-y-3">
            {todayVids.map(v => (
              <VideoCard
                key={v.id}
                video={v}
                watched={watched.has(v.id)}
                onWatched={handleWatched}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Jamming Video Library ────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
        <button
          onClick={() => setLibrary(o => !o)}
          className="w-full flex items-center justify-between p-4"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Jamming Library
          </p>
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform ${libraryOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {libraryOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-800 pt-4">
            {libraryVids.map(v => (
              <VideoCard
                key={v.id}
                video={v}
                watched={watched.has(v.id)}
                onWatched={handleWatched}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
