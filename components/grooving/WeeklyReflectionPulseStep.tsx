'use client'

import VideoCard from '@/components/challenge/VideoCard'
import type { PulseState, VideoEntry } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

type PulseOption = { state: PulseState; label: string; body: string; icon: string; ring: string }
const PULSE_OPTIONS: PulseOption[] = [
  { state: 'smooth_sailing',  label: 'Smooth Sailing',   body: "I've got this. Habits are forming.",    icon: '⛵', ring: 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-950' },
  { state: 'rough_waters',    label: 'Rough Waters',     body: "It's hard but I'm still in it.",        icon: '🌊', ring: 'border-amber-500 ring-2 ring-amber-500 bg-amber-950'     },
  { state: 'taking_on_water', label: 'Taking On Water',  body: "I'm struggling and close to quitting.", icon: '🆘', ring: 'border-red-500 ring-2 ring-red-500 bg-red-950'           },
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  pulseState:     PulseState | null
  onPulseChange:  (s: PulseState) => void
  isPending:      boolean
  pulseVideo:     VideoEntry | null
  showPulseVideo: boolean
  videoWatched:   Set<string>
  onVideoWatched: (id: string) => void
  continueLabel:  string
  onContinue:     () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WeeklyReflectionPulseStep({
  pulseState, onPulseChange, isPending,
  pulseVideo, showPulseVideo, videoWatched, onVideoWatched,
  continueLabel, onContinue,
}: Props) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-400">Pulse check</p>
        <p className="text-white font-bold text-base">How are you feeling about the challenge right now?</p>
      </div>

      <div className="flex flex-col gap-2">
        {PULSE_OPTIONS.map(opt => (
          <button
            key={opt.state}
            onClick={() => onPulseChange(opt.state)}
            className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
              pulseState === opt.state
                ? `${opt.ring} ring-offset-2 ring-offset-slate-950`
                : 'bg-slate-900 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{opt.icon}</span>
              <div>
                <p className={`font-black text-sm ${pulseState === opt.state ? 'text-white' : 'text-slate-300'}`}>{opt.label}</p>
                <p className={`text-xs mt-0.5 ${pulseState === opt.state ? 'text-slate-300' : 'text-slate-500'}`}>{opt.body}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {showPulseVideo && pulseVideo && (
        <VideoCard
          video={pulseVideo}
          watched={videoWatched.has(pulseVideo.id)}
          onWatched={onVideoWatched}
        />
      )}

      <button
        onClick={onContinue}
        disabled={!pulseState || isPending}
        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-white transition-colors"
      >
        {isPending ? 'Saving…' : continueLabel}
      </button>
    </div>
  )
}
