'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CLARITY_VIDEOS } from '@/lib/constants'
import ClarityVideoCard from '@/components/onboarding/ClarityVideoCard'

export default function ClarityVideosScreen() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function handleContinue() {
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
      <p className="text-slate-500 text-center text-sm mb-8">
        Take a few minutes with each. You can skip and come back later.
      </p>

      <div className="flex flex-col gap-4 mb-8">
        {CLARITY_VIDEOS.map((video) => (
          <ClarityVideoCard key={video.id} video={video} />
        ))}
      </div>

      <button
        onClick={handleContinue}
        disabled={saving}
        className={[
          'w-full py-3 rounded-xl font-semibold text-sm transition-colors',
          saving
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
        ) : (
          'Continue →'
        )}
      </button>

      <p className="text-center mt-3">
        <button
          onClick={handleContinue}
          disabled={saving}
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors disabled:cursor-not-allowed"
        >
          Skip for now
        </button>
      </p>
    </div>
  )
}
