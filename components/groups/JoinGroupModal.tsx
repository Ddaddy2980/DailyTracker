'use client'

import { useState, useTransition } from 'react'
import { joinGroup } from '@/app/actions-groups'
import type { ConsistencyGroup } from '@/lib/types'

interface Props {
  onJoined: (group: ConsistencyGroup) => void
  onClose:  () => void
  // Pre-fill from deep-link URL handler (Step 16d deep link route)
  initialCode?: string
}

const ERROR_COPY: Record<string, string> = {
  not_found:      "We couldn't find a group with that code. Double-check and try again.",
  inactive:       'That group is no longer active.',
  full:           "That group is full (12 members max). Ask the creator to make space.",
  already_member: "You're already in this group.",
  limit_reached:  "You are already in 12 groups, which is the maximum. Leave a group before joining a new one.",
}

export default function JoinGroupModal({ onJoined, onClose, initialCode = '' }: Props) {
  const [code, setCode]       = useState(initialCode)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState<ConsistencyGroup | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCodeChange(value: string) {
    setCode(value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
    setError(null)
  }

  function handleSubmit() {
    const trimmed = code.trim()
    if (!trimmed) { setError('Enter an invite code.'); return }

    setError(null)
    startTransition(async () => {
      const result = await joinGroup(trimmed)
      if (result.success) {
        setSuccess(result.group)
        onJoined(result.group)
      } else {
        setError(ERROR_COPY[result.error] ?? 'Something went wrong. Try again.')
      }
    })
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-4 sm:pb-0">
        <div className="w-full max-w-sm bg-white border border-[var(--card-border)] rounded-3xl p-6 space-y-5">
          <div className="text-center space-y-2">
            <p className="text-4xl">🎉</p>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">You&apos;re in</p>
            <p className="text-[var(--text-primary)] font-bold text-lg">Joined {success.name}</p>
            <p className="text-[var(--text-secondary)] text-sm">
              Your consistency is now witnessed. Show up for your group.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold
              rounded-2xl transition-colors text-sm"
          >
            Let&apos;s go →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm bg-white border border-[var(--card-border)] rounded-3xl p-6 space-y-5">

        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Join a group</p>
          <p className="text-[var(--text-primary)] font-bold text-lg">Enter your invite code</p>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            Ask the group creator for their code — it looks like GRACE-4K2M.
          </p>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={code}
            onChange={e => handleCodeChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="WORD-XXXX"
            autoFocus
            autoCapitalize="characters"
            className="w-full bg-gray-100 border border-[var(--card-border)] focus:border-violet-500 rounded-xl
              px-4 py-3 text-[var(--text-primary)] text-sm font-mono tracking-widest placeholder-gray-400
              focus:outline-none transition-colors uppercase"
          />
          {error && <p className="text-red-500 text-xs leading-snug">{error}</p>}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-[var(--text-secondary)] font-semibold
              rounded-2xl transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!code.trim() || isPending}
            className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40
              disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-colors text-sm"
          >
            {isPending ? 'Joining…' : 'Join →'}
          </button>
        </div>

      </div>
    </div>
  )
}
