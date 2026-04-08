'use client'

import { useState, useTransition } from 'react'
import { VIDEO_LIBRARY, getDayVideoIds, getJammingVideoIds, getSoloingVideoIds } from '@/lib/constants'
import { markVideoWatched } from '@/app/actions'
import type { VideoEntry, PulseState } from '@/lib/types'
import VideoCard from '@/components/challenge/VideoCard'

interface Props {
  level:           1 | 2 | 3 | 4
  dayNumber:       number
  selectedPillars: string[]
  watchedVideoIds: string[]
  lastPulseState:  PulseState | null
  // Required only at level 4 — provides Soloing-specific context for triggered video selection.
  soloingContext?: { durationDays: number; streakBroken: boolean }
}

const ALLOWED_MODULES: Record<1 | 2 | 3 | 4, string[]> = {
  1: ['A', 'B', 'C', 'D'],
  2: ['A', 'B', 'C', 'D', 'J'],
  3: ['A', 'B', 'C', 'D', 'J', 'G'],
  // Level 4 (Soloing) gets full cumulative access including the S module.
  4: ['A', 'B', 'C', 'D', 'J', 'G', 'S'],
}

const B_PILLAR: Record<string, string> = {
  B1: 'spiritual', B2: 'physical', B3: 'nutritional', B4: 'personal',
}

// S module sorts immediately after G — keeps Soloing coaching at the front of suggested.
const MODULE_SORT_ORDER = ['D', 'J', 'G', 'S', 'A', 'B', 'C']

export default function VideoLibraryTab({
  level, dayNumber, selectedPillars, watchedVideoIds, lastPulseState, soloingContext,
}: Props) {
  // Track watched list locally (ordered, newest last) so new watches appear immediately
  const [watchedList, setWatchedList] = useState<string[]>(watchedVideoIds)
  const [, startTransition]           = useTransition()

  function handleWatched(id: string) {
    setWatchedList(prev => prev.includes(id) ? prev : [...prev, id])
    startTransition(async () => {
      await markVideoWatched(id, 'video_library')
    })
  }

  const watchedSet = new Set(watchedList)

  // ── Available videos for this level ────────────────────────────────────────
  const allowed = ALLOWED_MODULES[level]
  const available: VideoEntry[] = VIDEO_LIBRARY.filter(v => {
    if (!allowed.includes(v.module)) return false
    if (v.module === 'B') {
      const pillar = B_PILLAR[v.id]
      return pillar ? selectedPillars.includes(pillar) : true
    }
    return true
  })
  const availableIds = new Set(available.map(v => v.id))

  // ── Today's triggered IDs ──────────────────────────────────────────────────
  function getTodayVideoIds(): string[] {
    if (level === 1) return getDayVideoIds(dayNumber, selectedPillars)
    if (level === 2) return getJammingVideoIds(dayNumber, lastPulseState)
    if (level === 3) {
      // L3: pulse-based G videos
      if (lastPulseState === 'smooth_sailing')  return ['G_SMOOTH']
      if (lastPulseState === 'rough_waters')    return ['G_ROUGH']
      if (lastPulseState === 'taking_on_water') return ['G_WATER']
      return []
    }
    // L4 (Soloing): day-number + event milestones. Requires soloingContext.
    if (!soloingContext) return []
    return getSoloingVideoIds(dayNumber, soloingContext.durationDays, soloingContext.streakBroken)
  }
  const todayIds = getTodayVideoIds()

  // ── Featured: first unwatched today-triggered → any unwatched → most-recent watched ──
  let featuredId: string | null = null
  let isRewatch                 = false

  const todayUnwatched = todayIds.filter(id => availableIds.has(id) && !watchedSet.has(id))
  if (todayUnwatched.length > 0) {
    featuredId = todayUnwatched[0]
  } else {
    const anyUnwatched = available.find(v => !watchedSet.has(v.id))
    if (anyUnwatched) {
      featuredId = anyUnwatched.id
    } else {
      for (let i = watchedList.length - 1; i >= 0; i--) {
        if (availableIds.has(watchedList[i])) {
          featuredId = watchedList[i]
          isRewatch  = true
          break
        }
      }
    }
  }

  const featuredVideo = featuredId ? available.find(v => v.id === featuredId) ?? null : null

  // ── Suggested: unwatched, excluding featured, sorted today-first then module order ──
  const suggested = available
    .filter(v => v.id !== featuredId && !watchedSet.has(v.id))
    .sort((a, b) => {
      const ai = todayIds.indexOf(a.id)
      const bi = todayIds.indexOf(b.id)
      if (ai !== -1 && bi === -1) return -1
      if (bi !== -1 && ai === -1) return 1
      if (ai !== -1 && bi !== -1) return ai - bi
      return MODULE_SORT_ORDER.indexOf(a.module) - MODULE_SORT_ORDER.indexOf(b.module)
    })

  // ── Already watched: available + watched, most-recent first, excluding featured-in-rewatch-mode ──
  const alreadyWatched = [...watchedList]
    .reverse()
    .filter(id => availableIds.has(id) && !(isRewatch && id === featuredId))
    .map(id => available.find(v => v.id === id))
    .filter((v): v is VideoEntry => Boolean(v))

  const isEmpty = !featuredVideo && suggested.length === 0 && alreadyWatched.length === 0

  return (
    <div className="space-y-8">

      {/* ── Today's coaching ── */}
      {featuredVideo && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
              Today&apos;s coaching
            </p>
            {isRewatch && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-[var(--text-secondary)]">
                Rewatch
              </span>
            )}
          </div>
          <VideoCard
            video={featuredVideo}
            watched={watchedSet.has(featuredVideo.id)}
            onWatched={handleWatched}
          />
        </section>
      )}

      {/* ── Suggested for you ── */}
      {suggested.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
            Suggested for you
          </p>
          <div className="space-y-4">
            {suggested.map(v => (
              <VideoCard key={v.id} video={v} watched={false} onWatched={handleWatched} />
            ))}
          </div>
        </section>
      )}

      {/* ── Already watched ── */}
      {alreadyWatched.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
            Already watched
          </p>
          <div className="space-y-4">
            {alreadyWatched.map(v => (
              <VideoCard key={v.id} video={v} watched={true} onWatched={handleWatched} />
            ))}
          </div>
        </section>
      )}

      {isEmpty && (
        <p className="text-sm text-[var(--text-secondary)] text-center py-8">
          No videos available yet. Check back soon.
        </p>
      )}

    </div>
  )
}
