'use client'

import { useState } from 'react'
import type { GroupWithDetails } from '@/lib/types'

interface CreateGroupModalProps {
  onClose: () => void
  onCreated: (group: GroupWithDetails) => void
}

export default function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    })

    setLoading(false)

    if (!res.ok) {
      setError('Could not create group. Try again.')
      return
    }

    const data = (await res.json()) as { group: GroupWithDetails }
    onCreated(data.group)
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
        <h2 className="text-white font-bold text-lg">Create a group</h2>

        <div>
          <label className="text-slate-400 text-xs uppercase tracking-widest block mb-1.5">
            Group name
          </label>
          <input
            className="w-full bg-[#2A3347] text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-slate-500"
            placeholder="e.g. Morning Crew"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            maxLength={30}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <p className="text-slate-500 text-xs mt-1 text-right">{name.length}/30</p>
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
            onClick={handleCreate}
            disabled={loading || name.trim().length === 0}
            className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-40"
          >
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
