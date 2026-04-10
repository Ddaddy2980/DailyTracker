'use client'

import type { VideoEntry } from '@/lib/types'

interface ClarityVideoCardProps {
  video: VideoEntry
}

export default function ClarityVideoCard({ video }: ClarityVideoCardProps) {
  const isComingSoon = video.url === ''

  function handlePlay() {
    if (!video.url) return
    window.open(video.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
      {/* Thumbnail area */}
      <div
        className="relative w-full aspect-video bg-slate-800 flex items-center justify-center cursor-pointer group"
        onClick={handlePlay}
      >
        {isComingSoon ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-12 h-12 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
          </>
        ) : (
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
      </div>

      {/* Title */}
      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">{video.title}</p>
      </div>
    </div>
  )
}
