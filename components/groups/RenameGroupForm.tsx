'use client'

import { useState } from 'react'

interface RenameGroupFormProps {
  groupId:     string
  currentName: string
  onRenamed:   () => void
}

export default function RenameGroupForm({ groupId, currentName, onRenamed }: RenameGroupFormProps) {
  const [renaming, setRenaming]   = useState(false)
  const [nameInput, setNameInput] = useState(currentName)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleRename() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === currentName) {
      setRenaming(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/groups/${groupId}/manage`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'rename', name: trimmed }),
      })
      if (!res.ok) {
        setError('Could not rename group. Try again.')
        return
      }
      setRenaming(false)
      onRenamed()
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-widest mb-1 px-1">
        Group Name
      </p>
      {renaming ? (
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 bg-[#2A3347] text-white rounded-xl px-4 py-3 text-sm outline-none"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={30}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <button
            onClick={handleRename}
            disabled={loading}
            className="px-4 py-3 bg-slate-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            Save
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-[#2A3347] rounded-xl px-4 py-3 mb-3">
          <span className="text-white text-sm">{currentName}</span>
          <button
            onClick={() => setRenaming(true)}
            className="text-slate-400 text-sm hover:text-white"
          >
            Edit
          </button>
        </div>
      )}
      {error && (
        <p className="text-red-400 text-xs mb-2">{error}</p>
      )}
    </div>
  )
}
