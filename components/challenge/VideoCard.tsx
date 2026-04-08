'use client'

import type { VideoEntry, VideoModule } from '@/lib/types'

interface Props {
  video:     VideoEntry
  watched:   boolean
  onWatched: (id: string) => void
}

const MODULE_UI: Record<VideoModule, { label: string; badge: string; accent: string; placeholderBg: string }> = {
  A: { label: 'Living on Purpose', badge: 'bg-purple-100 text-purple-700 border-purple-300',   accent: 'border-purple-200',  placeholderBg: 'bg-purple-50' },
  B: { label: 'The Four Pillars',  badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', accent: 'border-emerald-200', placeholderBg: 'bg-emerald-50' },
  C: { label: 'ACT System',        badge: 'bg-blue-100 text-blue-700 border-blue-300',          accent: 'border-blue-200',    placeholderBg: 'bg-blue-50' },
  D: { label: 'Daily Coaching',    badge: 'bg-amber-100 text-amber-700 border-amber-300',       accent: 'border-amber-200',   placeholderBg: 'bg-amber-50' },
  J: { label: 'Jamming',           badge: 'bg-violet-100 text-violet-700 border-violet-300',    accent: 'border-violet-200',  placeholderBg: 'bg-violet-50' },
  G: { label: 'Grooving',          badge: 'bg-teal-100 text-teal-700 border-teal-300',          accent: 'border-teal-200',    placeholderBg: 'bg-teal-50' },
  S: { label: 'Soloing',           badge: 'bg-indigo-100 text-indigo-700 border-indigo-300',    accent: 'border-indigo-200',  placeholderBg: 'bg-indigo-50' },
}

export default function VideoCard({ video, watched, onWatched }: Props) {
  const ui      = MODULE_UI[video.module]
  const isLive  = Boolean(video.url)

  // ── Placeholder state ──────────────────────────────────────────────────────
  if (!isLive) {
    return (
      <div className={`rounded-2xl border bg-white overflow-hidden ${ui.accent}`}>
        <div className={`${ui.placeholderBg} px-4 pt-5 pb-4 space-y-3`}>

          {/* Module badge + Coming Soon pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${ui.badge}`}>
              {video.id} · {ui.label}
            </span>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-gray-300 bg-gray-100 text-[var(--text-secondary)]">
              Coming Soon
            </span>
          </div>

          {/* Camera icon + title */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{video.title}</p>
          </div>

          {/* Message */}
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            This coaching video is being recorded and will be available soon. Check back in a few days.
          </p>

        </div>
      </div>
    )
  }

  // ── Live state ─────────────────────────────────────────────────────────────
  return (
    <div className={`rounded-2xl border bg-white overflow-hidden ${watched ? 'opacity-70' : ''} ${ui.accent}`}>

      {/* Video player */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={video.url}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>

      {/* Info row */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${ui.badge}`}>
                {video.id} · {ui.label}
              </span>
              {video.duration && (
                <span className="text-[10px] text-[var(--text-muted)]">{video.duration}</span>
              )}
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{video.title}</p>
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
            className="w-full py-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Mark watched
          </button>
        )}
      </div>

    </div>
  )
}
