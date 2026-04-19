'use client'

import { useState } from 'react'
import { VIDEO_LIBRARY, VIDEO_LIBRARY_SECTIONS } from '@/lib/constants'
import type { VideoEntry } from '@/lib/types'
import VideoModal from '@/components/shared/VideoModal'

interface VideoLibraryProps {
  initialWatchedIds: string[]
}

export default function VideoLibrary({ initialWatchedIds }: VideoLibraryProps) {
  const [watchedIds, setWatchedIds] = useState<Set<string>>(
    () => new Set(initialWatchedIds)
  )
  const [activeVideo, setActiveVideo] = useState<VideoEntry | null>(null)

  function handleVideoWatched(videoId: string) {
    setWatchedIds((prev) => new Set([...prev, videoId]))
  }

  const totalVideos = VIDEO_LIBRARY_SECTIONS.reduce((sum, s) => sum + s.videoIds.length, 0)
  const watchedCount = VIDEO_LIBRARY_SECTIONS.reduce(
    (sum, s) => sum + s.videoIds.filter((id) => watchedIds.has(id)).length,
    0
  )

  return (
    <>
      {/* Overall progress */}
      <div className="mb-6 px-1">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-slate-500">Overall progress</p>
          <p className="text-xs text-slate-400">{watchedCount} of {totalVideos} watched</p>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-700 rounded-full transition-all duration-300"
            style={{ width: `${totalVideos > 0 ? Math.round((watchedCount / totalVideos) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {VIDEO_LIBRARY_SECTIONS.map((section) => {
          const sectionWatched = section.videoIds.filter((id) => watchedIds.has(id)).length
          return (
            <div key={section.title}>
              {/* Section header */}
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="text-base font-semibold text-slate-800">{section.title}</h2>
                <span className="text-xs text-slate-400">
                  {sectionWatched}/{section.videoIds.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{section.description}</p>

              {/* Video rows */}
              <div className="space-y-2">
                {section.videoIds.map((videoId) => {
                  const video = VIDEO_LIBRARY[videoId]
                  if (!video) return null
                  const watched = watchedIds.has(videoId)
                  const hasUrl = video.url !== ''

                  return (
                    <button
                      key={videoId}
                      type="button"
                      onClick={() => setActiveVideo(video)}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                    >
                      {/* Watched indicator */}
                      <div
                        className={[
                          'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                          watched
                            ? 'bg-emerald-500'
                            : 'border-2 border-slate-200',
                        ].join(' ')}
                      >
                        {watched && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* Title */}
                      <p className={[
                        'flex-1 text-sm leading-snug',
                        watched ? 'text-slate-500' : 'text-slate-800',
                      ].join(' ')}>
                        {video.title}
                      </p>

                      {/* Coming Soon badge or play icon */}
                      {!hasUrl ? (
                        <span className="shrink-0 text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Soon
                        </span>
                      ) : (
                        <svg className="w-4 h-4 text-slate-300 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Video modal */}
      {activeVideo && (
        <VideoModal
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
          onWatched={handleVideoWatched}
        />
      )}
    </>
  )
}
