'use client'

import { useState, useEffect, useRef } from 'react'

interface AccountSectionProps {
  username: string
  email: string
}

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/
type AvailabilityState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'unchanged'

export default function AccountSection({ username, email }: AccountSectionProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(username)
  const [availability, setAvailability] = useState<AvailabilityState>('idle')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedUsername, setSavedUsername] = useState(username)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  function handleChange(raw: string) {
    const normalized = raw.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setValue(normalized)
    setSaveError(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (normalized === savedUsername) {
      setAvailability('unchanged')
      return
    }

    if (normalized.length === 0) {
      setAvailability('idle')
      return
    }

    if (!USERNAME_REGEX.test(normalized)) {
      setAvailability('invalid')
      return
    }

    setAvailability('checking')
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/onboarding/username?username=${encodeURIComponent(normalized)}`
        )
        const data = await res.json() as { available: boolean }
        setAvailability(data.available ? 'available' : 'taken')
      } catch {
        setAvailability('idle')
      }
    }, 400)
  }

  function handleEditStart() {
    setValue(savedUsername)
    setAvailability('idle')
    setSaveError(null)
    setEditing(true)
  }

  function handleCancel() {
    setValue(savedUsername)
    setAvailability('idle')
    setSaveError(null)
    setEditing(false)
  }

  async function handleSave() {
    if (saving) return
    if (availability !== 'available' && availability !== 'unchanged') return

    setSaving(true)
    setSaveError(null)

    const res = await fetch('/api/settings/username', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: value }),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      setSaveError(data.error ?? 'Something went wrong. Please try again.')
      setSaving(false)
      return
    }

    setSavedUsername(value)
    setSaving(false)
    setEditing(false)
  }

  const canSave =
    !saving &&
    (availability === 'available' || availability === 'unchanged') &&
    value.length >= 3

  return (
    <section className="bg-white rounded-2xl px-5 py-5 shadow-sm mb-4">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Account</h2>
      <div className="space-y-3">

        {/* Username row */}
        <div>
          <p className="text-xs text-slate-400 mb-1">Username</p>
          {editing ? (
            <div>
              <div className={[
                'flex items-center gap-2 rounded-xl border-2 px-3 py-2 bg-white transition-colors',
                availability === 'available' || availability === 'unchanged'
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
                  maxLength={20}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                  className="flex-1 text-slate-900 text-sm font-medium bg-transparent outline-none"
                />
                <span className="text-xs text-slate-300 tabular-nums select-none">
                  {value.length}/20
                </span>
              </div>

              {/* Inline status */}
              <div className="mt-1 min-h-[16px] px-0.5">
                {availability === 'checking' && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Checking…
                  </p>
                )}
                {availability === 'available' && (
                  <p className="text-xs text-emerald-600">@{value} is available</p>
                )}
                {availability === 'taken' && (
                  <p className="text-xs text-red-500">@{value} is already taken</p>
                )}
                {availability === 'invalid' && value.length > 0 && value.length < 3 && (
                  <p className="text-xs text-red-500">Must be at least 3 characters</p>
                )}
                {saveError && (
                  <p className="text-xs text-red-500">{saveError}</p>
                )}
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className={[
                    'flex-1 py-2 rounded-lg text-sm font-semibold transition-colors',
                    canSave
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                  ].join(' ')}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">@{savedUsername}</p>
              <button
                onClick={handleEditStart}
                className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Email row — read-only */}
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Email</p>
          <p className="text-sm font-medium text-slate-700">{email || '—'}</p>
        </div>
      </div>
    </section>
  )
}
