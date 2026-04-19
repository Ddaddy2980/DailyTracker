'use client'

import { useEffect } from 'react'
import type { VideoEntry } from '@/lib/types'

interface VideoModalProps {
  video: VideoEntry
  onClose: () => void
  onWatched: (videoId: string) => void
}

export default function VideoModal({ video, onClose, onWatched }: VideoModalProps) {
  // Mark as watched immediately on open — click = watched (same as clarity screen)
  useEffect(() => {
    onWatched(video.id)
    fetch('/api/videos/watched', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: video.id }),
    }).catch((err) => console.error('VideoModal: failed to record watch:', err))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const hasUrl = video.url !== ''

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel — slides up from bottom on mobile */}
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <p className="text-sm font-semibold text-slate-800 leading-snug pr-4">
            {video.title}
          </p>
          <button
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close video"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Video area */}
        <div className="relative w-full aspect-video bg-slate-900">
          {hasUrl ? (
            <iframe
              src={video.url}
              title={video.title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <svg className="w-14 h-14 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span className="bg-amber-400 text-amber-900 text-xs font-semibold px-3 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
