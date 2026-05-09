'use client'

import { useState } from 'react'
import type { GroupWithDetails } from '@/lib/types'
import GroupInvitePanel from './GroupInvitePanel'
import RenameGroupForm from './RenameGroupForm'
import DeleteGroupConfirm from './DeleteGroupConfirm'

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
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(group.is_public ?? true)

  async function handleTogglePublic() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/groups/${group.id}/manage`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'toggle_public' }),
      })
      if (!res.ok) {
        setError('Could not update group visibility. Try again.')
        return
      }
      setIsPublic((prev) => !prev)
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLeave() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/groups/${group.id}/members`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ targetUserId: currentUserId }),
      })
      if (!res.ok) {
        setError('Could not leave group. Try again.')
        return
      }
      onLeft()
    } catch {
      setError('Connection error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
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
            <RenameGroupForm
              groupId={group.id}
              currentName={group.name}
              onRenamed={onRefresh}
            />

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
                role="switch"
                aria-checked={isPublic}
                aria-label={isPublic ? 'Make group private' : 'Make group public'}
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
            <DeleteGroupConfirm groupId={group.id} onDeleted={onDeleted} />
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
