'use client'

import { useState, useTransition } from 'react'
import { markVideoWatched } from '@/app/actions'
import { VIDEO_LIBRARY, getDayVideoIds } from '@/lib/constants'
import type { VideoModule } from '@/lib/types'
import VideoCard from './VideoCard'

interface Props {
  dayNumber:        number
  selectedPillars:  string[]
  watchedVideoIds:  string[]
}

const MODULE_LABELS: Record<VideoModule, string> = {
  A: 'Module A — Living on Purpose',
  B: 'Module B — The Four Pillars',
  C: 'Module C — ACT System',
  D: 'Module D — Daily Coaching',
}

export default function VideoSection({ dayNumber, selectedPillars, watchedVideoIds }: Props) {
  const [watched, setWatched] = useState<Set<string>>(new Set(watchedVideoIds))
  const [, startTransition] = useTransition()
  const [libraryOpen, setLibraryOpen] = useState(false)

  function handleWatched(videoId: string) {
    setWatched(prev => new Set([...prev, videoId]))
    startTransition(async () => {
      await markVideoWatched(videoId, `day_${dayNumber}`)
    })
  }

  const todayIds  = getDayVideoIds(dayNumber, selectedPillars)
  const todayVids = todayIds
    .map(id => VIDEO_LIBRARY.find(v => v.id === id))
    .filter((v): v is NonNullable<typeof v> => Boolean(v))

  // Group all videos by module for the library view
  const modules: VideoModule[] = ['A', 'B', 'C', 'D']
  const byModule = Object.fromEntries(
    modules.map(m => [m, VIDEO_LIBRARY.filter(v => v.module === m)])
  ) as Record<VideoModule, typeof VIDEO_LIBRARY>

  return (
    <div className="space-y-6">

      {/* ── Today's Coaching ────────────────────────────────────────────────── */}
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

      {/* ── Full Library ────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
        <button
          onClick={() => setLibraryOpen(o => !o)}
          className="w-full flex items-center justify-between p-4"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Video Library
          </p>
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform ${libraryOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {libraryOpen && (
          <div className="px-4 pb-4 space-y-6 border-t border-slate-800 pt-4">
            {modules.map(m => (
              <div key={m} className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {MODULE_LABELS[m]}
                </p>
                <div className="space-y-3">
                  {byModule[m].map(v => (
                    <VideoCard
                      key={v.id}
                      video={v}
                      watched={watched.has(v.id)}
                      onWatched={handleWatched}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
