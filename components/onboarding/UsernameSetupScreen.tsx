'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

type AvailabilityState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function UsernameSetupScreen() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [availability, setAvailability] = useState<AvailabilityState>('idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Normalize input: strip invalid chars, force lowercase
  function handleChange(raw: string) {
    const normalized = raw.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setValue(normalized)
    setError(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (normalized.length === 0) {
      setAvailability('idle')
      return
    }

    if (!USERNAME_REGEX.test(normalized)) {
      setAvailability('invalid')
      return
    }

    setAvailability('checking')
    debounceRef.current = setTimeout(() => checkAvailability(normalized), 400)
  }

  async function checkAvailability(username: string) {
    try {
      const res = await fetch(
        `/api/onboarding/username?username=${encodeURIComponent(username)}`
      )
      const data = await res.json() as { available: boolean }
      setAvailability(data.available ? 'available' : 'taken')
    } catch {
      setAvailability('idle')
    }
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  async function handleContinue() {
    if (saving || availability !== 'available') return
    setSaving(true)
    setError(null)

    const res = await fetch('/api/onboarding/username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: value }),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Something went wrong. Please try again.')
      setSaving(false)
      return
    }

    router.push('/onboarding/duration')
  }

  const canSubmit = availability === 'available' && !saving

  return (
    <div className="w-full max-w-lg mt-6">
      <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
        Choose Your Username
      </h1>
      <p className="text-slate-500 text-center mb-8 text-sm">
        This is how you&apos;ll appear to others in accountability groups.
        You can change it later in Settings.
      </p>

      <div className="mb-2">
        <div className={[
          'flex items-center gap-3 w-full rounded-xl border-2 px-4 py-3 bg-white transition-colors',
          availability === 'available'
            ? 'border-emerald-500'
            : availability === 'taken' || availability === 'invalid'
            ? 'border-red-400'
            : 'border-slate-200 focus-within:border-slate-400',
        ].join(' ')}>
          <span className="text-slate-400 text-sm select-none">@</span>
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="your_username"
            maxLength={20}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 text-slate-900 text-base font-medium bg-transparent outline-none placeholder:text-slate-300"
          />
          <span className="text-xs text-slate-300 tabular-nums select-none">
            {value.length}/20
          </span>
        </div>

        {/* Availability indicator */}
        <div className="mt-1.5 min-h-[18px] px-1">
          {availability === 'checking' && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Checking availability…
            </p>
          )}
          {availability === 'available' && (
            <p className="text-xs text-emerald-600 font-medium">@{value} is available</p>
          )}
          {availability === 'taken' && (
            <p className="text-xs text-red-500">@{value} is already taken</p>
          )}
          {availability === 'invalid' && value.length > 0 && value.length < 3 && (
            <p className="text-xs text-red-500">Must be at least 3 characters</p>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-8 px-1">
        3–20 characters · lowercase letters, numbers, and underscores only
      </p>

      {error && (
        <p className="text-sm text-red-500 mb-4 text-center">{error}</p>
      )}

      <button
        onClick={handleContinue}
        disabled={!canSubmit}
        className={[
          'w-full py-3 rounded-xl font-semibold text-sm transition-colors',
          canSubmit
            ? 'bg-slate-900 text-white hover:bg-slate-800'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed',
        ].join(' ')}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Saving…
          </span>
        ) : (
          'Continue →'
        )}
      </button>
    </div>
  )
}
