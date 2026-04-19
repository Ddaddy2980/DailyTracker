'use client'

import { useState } from 'react'
import type { VideoEntry } from '@/lib/types'

interface ClarityVideoCardProps {
  video: VideoEntry
  isWatched: boolean
  onWatched: (videoId: string) => void
}

export default function ClarityVideoCard({ video, isWatched, onWatched }: ClarityVideoCardProps) {
  const [pressed, setPressed] = useState(false)

  async function handlePress() {
    if (video.url) {
      window.open(video.url, '_blank', 'noopener,noreferrer')
    }

    if (!isWatched) {
      try {
        await fetch('/api/onboarding/videos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: video.id }),
        })
        onWatched(video.id)
      } catch (err) {
        console.error('ClarityVideoCard: failed to mark watched:', err)
      }
    }
  }

  return (
    <div className="w-full">
      {/* 3D push button */}
      <button
        type="button"
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onClick={handlePress}
        className={[
          'w-full relative rounded-xl overflow-hidden transition-all duration-75 select-none',
          pressed
            ? 'translate-y-[3px] shadow-[0_3px_0_0_#94a3b8]'
            : 'shadow-[0_6px_0_0_#94a3b8]',
          isWatched ? 'bg-emerald-50' : 'bg-slate-200',
        ].join(' ')}
      >
        {/* Green tint overlay when watched */}
        {isWatched && (
          <div className="absolute inset-0 bg-emerald-100/60 rounded-xl pointer-events-none" />
        )}

        <div className="relative flex items-center gap-4 px-5 py-4">
          {/* Icon area */}
          <div
            className={[
              'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
              isWatched ? 'bg-emerald-500' : 'bg-slate-400',
            ].join(' ')}
          >
            {isWatched ? (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>

          {/* Text area */}
          <div className="flex-1 text-left">
            <p className={`text-sm font-semibold leading-snug ${isWatched ? 'text-emerald-800' : 'text-slate-700'}`}>
              {video.title}
            </p>
            <p className={`text-xs mt-0.5 ${isWatched ? 'text-emerald-600' : 'text-slate-500'}`}>
              {isWatched ? 'Rewatch Video' : 'Press to Play Video'}
            </p>
          </div>
        </div>
      </button>
    </div>
  )
}
