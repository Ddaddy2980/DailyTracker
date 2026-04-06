'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { updatePillarGoals, markG6bTriggered, markVideoWatched } from '@/app/actions'
import { PILLAR_CONFIG, VIDEO_LIBRARY } from '@/lib/constants'
import type { Challenge, DurationGoalDestination, PillarLevel } from '@/lib/types'
import { LEVEL_NAMES } from '@/lib/types'
import DestinationGoalSection from '@/components/challenge/DestinationGoalSection'
import VideoCard from '@/components/challenge/VideoCard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  challenge:              Challenge
  pillars:                string[]
  pillarGoals:            Record<string, string>
  durationGoalsByPillar?: Record<string, DurationGoalDestination[]>
  pillarLevelsByPillar?:  Record<string, PillarLevel>
  onSaved:                () => void
  videoG6bTriggered?:     boolean   // from user_profile; default true (safe — never show)
}

type PillarCfg = typeof PILLAR_CONFIG[keyof typeof PILLAR_CONFIG]

function getCfg(pillar: string): PillarCfg {
  return (PILLAR_CONFIG as Record<string, PillarCfg>)[pillar] ?? PILLAR_CONFIG.spiritual
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChallengeGoalsTab({
  challenge, pillars, pillarGoals,
  durationGoalsByPillar = {}, pillarLevelsByPillar = {}, onSaved,
  videoG6bTriggered = true,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [goals, setGoals] = useState<Record<string, string>>(pillarGoals)
  const [saved, setSaved] = useState(false)

  // G6b video trigger — shown once in the session when user adds their first destination goal.
  const [showG6bVideo, setShowG6bVideo] = useState(false)
  const [g6bWatched,   setG6bWatched]   = useState(false)

  const g6bEntry = VIDEO_LIBRARY.find(v => v.id === 'G6b')

  const [, startVideoTransition] = useTransition()

  function handleG6bTrigger() {
    setShowG6bVideo(true)
    startVideoTransition(async () => {
      await markG6bTriggered()
    })
  }

  function handleG6bWatched(videoId: string) {
    setG6bWatched(true)
    startVideoTransition(async () => {
      await markVideoWatched(videoId, 'first_destination_goal')
    })
  }

  const levelName = LEVEL_NAMES[challenge.level] ?? `Level ${challenge.level}`
  const startDate = new Date(challenge.start_date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const endDate = new Date(challenge.end_date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  const isDirty = pillars.some(p => goals[p] !== pillarGoals[p])

  function handleSave() {
    startTransition(async () => {
      await updatePillarGoals(challenge.id, goals)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved()
    })
  }

  return (
    <div className="space-y-5">

      {/* Challenge info */}
      <div className="bg-white border border-[var(--card-border)] rounded-2xl px-4 py-4 space-y-1.5">
        <p className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">
          Level {challenge.level} — {levelName}
        </p>
        <p className="text-sm text-[var(--text-secondary)]">{startDate} → {endDate}</p>
        <p className="text-xs text-[var(--text-muted)]">
          {challenge.duration_days}-day challenge · {challenge.days_completed} days complete
        </p>
      </div>

      {/* G6b video card — surfaces once after the first destination goal is added */}
      {showG6bVideo && !g6bWatched && g6bEntry && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-600">New Coaching</p>
          <VideoCard
            video={g6bEntry}
            watched={g6bWatched}
            onWatched={handleG6bWatched}
          />
        </div>
      )}

      {/* Pillar goal cards */}
      <div className="space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">Your Goals</p>
        {pillars.map(pillar => {
          const cfg         = getCfg(pillar)
          const pillarLevel = pillarLevelsByPillar[pillar]?.level ?? 1
          const destGoals   = durationGoalsByPillar[pillar] ?? []
          const isGroovingPlus = pillarLevel >= 3

          return (
            <div key={pillar} className="rounded-2xl px-4 py-3 space-y-2" style={{ backgroundColor: cfg.background }}>
              {/* Pillar header */}
              <div className="flex items-center gap-1.5">
                <Image
                  src={cfg.icon}
                  width={20}
                  height={20}
                  alt={cfg.label}
                  className="invert shrink-0"
                />
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.title }}>
                  {cfg.label}
                </p>
              </div>

              {/* Duration goal input */}
              <input
                type="text"
                value={goals[pillar] ?? ''}
                onChange={e => setGoals(prev => ({ ...prev, [pillar]: e.target.value }))}
                className="w-full text-sm text-white bg-transparent border-b border-white/40 pb-1 focus:outline-none focus:border-white/80 transition-colors placeholder:text-white/50"
                placeholder={`${cfg.label} goal…`}
              />

              {/* Destination goals — Grooving level and above only */}
              {isGroovingPlus && (
                <DestinationGoalSection
                  pillar={pillar}
                  challengeId={challenge.id}
                  pillarLevel={pillarLevel}
                  activeGoals={destGoals}
                  subtitleColor={cfg.subtitle}
                  onChanged={onSaved}
                  videoG6bTriggered={videoG6bTriggered || showG6bVideo}
                  onG6bTrigger={handleG6bTrigger}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Duration goal save */}
      {isDirty && (
        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
      )}

      {saved && !isDirty && (
        <p className="text-center text-sm text-emerald-600 font-semibold">Goals saved ✓</p>
      )}

    </div>
  )
}
