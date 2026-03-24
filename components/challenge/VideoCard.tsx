'use client'

import type { VideoEntry, VideoModule } from '@/lib/types'

interface Props {
  video:     VideoEntry
  watched:   boolean
  onWatched: (id: string) => void
}

const MODULE_UI: Record<VideoModule, { label: string; badge: string; accent: string }> = {
  A: { label: 'Living on Purpose', badge: 'bg-purple-900 text-purple-300 border-purple-700', accent: 'border-purple-800' },
  B: { label: 'The Four Pillars',  badge: 'bg-emerald-900 text-emerald-300 border-emerald-700', accent: 'border-emerald-800' },
  C: { label: 'ACT System',        badge: 'bg-blue-900 text-blue-300 border-blue-700',         accent: 'border-blue-800' },
  D: { label: 'Daily Coaching',    badge: 'bg-amber-900 text-amber-300 border-amber-700',       accent: 'border-amber-800' },
}

export default function VideoCard({ video, watched, onWatched }: Props) {
  const ui = MODULE_UI[video.module]

  return (
    <div className={`rounded-2xl border bg-slate-900 overflow-hidden ${watched ? 'opacity-70' : ''} ${ui.accent}`}>

      {/* Video or placeholder */}
      {video.url ? (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={video.url}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      ) : (
        <div className="w-full bg-slate-800 flex flex-col items-center justify-center gap-2 py-8 px-4">
          <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Coming soon</span>
        </div>
      )}

      {/* Info row */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mb-1.5 ${ui.badge}`}>
              {video.id} · {ui.label}
            </span>
            <p className="text-sm font-semibold text-white leading-snug">{video.title}</p>
          </div>

          {watched && (
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center mt-0.5">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>

        {!watched && (
          <button
            onClick={() => onWatched(video.id)}
            className="w-full py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Mark watched
          </button>
        )}
      </div>
    </div>
  )
}
