'use client'

import { useState } from 'react'

interface JoinGroupModalProps {
  onClose: () => void
  onJoined: (groupId: string) => void
}

export default function JoinGroupModal({ onClose, onJoined }: JoinGroupModalProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length === 0) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: trimmed }),
    })

    setLoading(false)

    if (res.status === 409) {
      // Already a member — still navigate to the group
      const data = (await res.json()) as { groupId?: string }
      if (data.groupId) {
        onJoined(data.groupId)
        return
      }
    }

    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      const msg = data.error ?? 'Something went wrong.'
      if (msg === 'Invalid invite code') setError('That code doesn\'t match any group.')
      else if (msg === 'This group is full') setError('This group is already full.')
      else if (msg.includes('no longer accepting')) setError('This group is no longer accepting new members.')
      else setError(msg)
      return
    }

    const data = (await res.json()) as { groupId: string }
    onJoined(data.groupId)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#1C2333] rounded-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-white font-bold text-lg">Join a group</h2>
        <p className="text-slate-400 text-sm">
          Enter the 5-character code shared by your group creator.
        </p>

        <div>
          <label className="text-slate-400 text-xs uppercase tracking-widest block mb-1.5">
            Invite code
          </label>
          <input
            className="w-full bg-[#2A3347] text-white font-mono font-bold tracking-widest text-center rounded-xl px-4 py-3 text-lg uppercase outline-none placeholder:text-slate-500 placeholder:font-normal placeholder:tracking-normal"
            placeholder="A3K9M"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 5))}
            maxLength={5}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-[#2A3347] text-slate-300 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={loading || code.trim().length === 0}
            className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-40"
          >
            {loading ? 'Joining…' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  )
}
