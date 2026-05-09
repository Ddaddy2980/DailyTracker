'use client'

import { useState } from 'react'

interface DeleteGroupConfirmProps {
  groupId:   string
  onDeleted: () => void
}

export default function DeleteGroupConfirm({ groupId, onDeleted }: DeleteGroupConfirmProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/groups/${groupId}/manage`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'delete' }),
      })
      if (!res.ok) {
        setError('Could not delete group. Try again.')
        return
      }
      onDeleted()
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (confirmDelete) {
    return (
      <div className="bg-[#2A3347] rounded-xl px-4 py-3">
        <p className="text-white text-sm mb-3">
          Delete this group? This cannot be undone.
        </p>
        {error && (
          <p className="text-red-400 text-xs mb-2">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setConfirmDelete(false)}
            className="flex-1 py-2.5 rounded-xl bg-slate-600 text-white text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete group'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirmDelete(true)}
      className="w-full text-left bg-[#2A3347] rounded-xl px-4 py-3 text-red-400 text-sm font-medium"
    >
      Delete group
    </button>
  )
}
