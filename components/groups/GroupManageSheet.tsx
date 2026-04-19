'use client'

import { useState } from 'react'
import type { GroupWithDetails } from '@/lib/types'
import GroupInvitePanel from './GroupInvitePanel'

interface GroupManageSheetProps {
  group: GroupWithDetails
  currentUserId: string
  isCreator: boolean
  onClose: () => void
  onRefresh: () => void
  onDeleted: () => void
  onLeft: () => void
}

export default function GroupManageSheet({
  group,
  currentUserId,
  isCreator,
  onClose,
  onRefresh,
  onDeleted,
  onLeft,
}: GroupManageSheetProps) {
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(group.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(group.is_public ?? true)

  async function handleRename() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === group.name) {
      setRenaming(false)
      return
    }
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/groups/${group.id}/manage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rename', name: trimmed }),
    })
    setLoading(false)
    if (!res.ok) {
      setError('Could not rename group. Try again.')
      return
    }
    setRenaming(false)
    onRefresh()
  }

  async function handleTogglePublic() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/groups/${group.id}/manage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_public' }),
    })
    setLoading(false)
    if (!res.ok) {
      setError('Could not update group visibility. Try again.')
      return
    }
    setIsPublic((prev) => !prev)
  }

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/groups/${group.id}/manage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    })
    setLoading(false)
    if (!res.ok) {
      setError('Could not delete group. Try again.')
      return
    }
    onDeleted()
  }

  async function handleLeave() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/groups/${group.id}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: currentUserId }),
    })
    setLoading(false)
    if (!res.ok) {
      setError('Could not leave group. Try again.')
      return
    }
    onLeft()
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      {/* Sheet */}
      <div
        className="w-full max-w-lg bg-[#1C2333] rounded-t-2xl px-4 pt-4 pb-24 space-y-1 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center pb-2">{error}</p>
        )}

        {isCreator ? (
          <>
            {/* GROUP NAME */}
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
                <span className="text-white text-sm">{group.name}</span>
                <button
                  onClick={() => setRenaming(true)}
                  className="text-slate-400 text-sm hover:text-white"
                >
                  Edit
                </button>
              </div>
            )}

            {/* PUBLIC / PRIVATE TOGGLE */}
            <div className="flex items-center justify-between bg-[#2A3347] rounded-xl px-4 py-3 mb-3">
              <div>
                <p className="text-white text-sm font-medium">
                  {isPublic ? 'Public' : 'Private'}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {isPublic
                    ? 'Anyone can find and request to join'
                    : 'Only invited members can join'}
                </p>
              </div>
              <button
                onClick={handleTogglePublic}
                disabled={loading}
                className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${
                  isPublic ? 'bg-purple-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* INVITE BY USERNAME */}
            <div className="mb-3">
              <GroupInvitePanel groupId={group.id} />
            </div>

            {/* DELETE */}
            {confirmDelete ? (
              <div className="bg-[#2A3347] rounded-xl px-4 py-3">
                <p className="text-white text-sm mb-3">
                  Delete this group? This cannot be undone.
                </p>
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
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full text-left bg-[#2A3347] rounded-xl px-4 py-3 text-red-400 text-sm font-medium"
              >
                Delete group
              </button>
            )}
          </>
        ) : (
          /* Non-creator: leave only */
          <button
            onClick={handleLeave}
            disabled={loading}
            className="w-full bg-[#2A3347] rounded-xl px-4 py-3 text-red-400 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Leaving…' : 'Leave group'}
          </button>
        )}
      </div>
    </div>
  )
}
