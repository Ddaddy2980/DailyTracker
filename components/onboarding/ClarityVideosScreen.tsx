'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CLARITY_VIDEOS } from '@/lib/constants'
import ClarityVideoCard from '@/components/onboarding/ClarityVideoCard'

interface ClarityVideosScreenProps {
  // Pre-loaded watched video IDs from the DB (restored on revisit)
  initialWatchedIds?: string[]
}

export default function ClarityVideosScreen({ initialWatchedIds = [] }: ClarityVideosScreenProps) {
  const router = useRouter()
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set(initialWatchedIds))
  const [saving, setSaving] = useState(false)

  const totalCount = CLARITY_VIDEOS.length
  const watchedCount = watchedIds.size
  const allWatched = watchedCount === totalCount

  function handleWatched(videoId: string) {
    setWatchedIds((prev) => new Set([...prev, videoId]))
  }

  async function handleContinue() {
    if (saving || !allWatched) return
    setSaving(true)

    const res = await fetch('/api/onboarding/videos', {
      method: 'POST',
    })

    if (!res.ok) {
      setSaving(false)
      return
    }

    router.push('/onboarding/profile')
  }

  async function handleSkip() {
    if (saving) return
    setSaving(true)

    const res = await fetch('/api/onboarding/videos', {
      method: 'POST',
    })

    if (!res.ok) {
      setSaving(false)
      return
    }

    router.push('/onboarding/profile')
  }

  return (
    <div className="w-full max-w-lg mt-6">
      <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
        Three things to understand before you begin
      </h1>
      <p className="text-slate-500 text-center text-sm mb-2">
        Take a few minutes with each. You can skip and come back later.
      </p>

      {/* Watched counter */}
      <p className="text-center text-xs font-semibold text-slate-400 mb-6">
        {watchedCount} of {totalCount} watched
      </p>

      <div className="flex flex-col gap-4 mb-8">
        {CLARITY_VIDEOS.map((video) => (
          <ClarityVideoCard
            key={video.id}
            video={video}
            isWatched={watchedIds.has(video.id)}
            onWatched={handleWatched}
          />
        ))}
      </div>

      <button
        onClick={handleContinue}
        disabled={saving || !allWatched}
        className={[
          'w-full py-3 rounded-xl font-semibold text-sm transition-colors',
          saving || !allWatched
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-slate-900 text-white hover:bg-slate-800',
        ].join(' ')}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Continuing…
          </span>
        ) : allWatched ? (
          'Continue →'
        ) : (
          `Watch all ${totalCount} videos to continue`
        )}
      </button>

      <p className="text-center mt-3">
        <button
          onClick={handleSkip}
          disabled={saving}
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors disabled:cursor-not-allowed"
        >
          Skip for now
        </button>
      </p>
    </div>
  )
}
