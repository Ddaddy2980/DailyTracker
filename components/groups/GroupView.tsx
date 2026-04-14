'use client'

import { useState, useCallback } from 'react'
import type { GroupWithDetails } from '@/lib/types'
import GroupCard from './GroupCard'
import CreateGroupModal from './CreateGroupModal'
import JoinGroupModal from './JoinGroupModal'

interface GroupViewProps {
  initialGroups: GroupWithDetails[]
  currentUserId: string
  joinError?: string | null
}

export default function GroupView({
  initialGroups,
  currentUserId,
  joinError,
}: GroupViewProps) {
  const [groups, setGroups] = useState<GroupWithDetails[]>(initialGroups)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  // Re-fetch a single group and update local state
  const handleRefresh = useCallback(async (groupId: string) => {
    const res = await fetch(`/api/groups/${groupId}`)
    if (!res.ok) return
    const data = (await res.json()) as { group: GroupWithDetails }
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? data.group : g))
    )
  }, [])

  // Remove a group from local state (deleted or left)
  const handleRemoved = useCallback((groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
  }, [])

  // After creating a new group, add it to the list
  function handleCreated(group: GroupWithDetails) {
    setGroups((prev) => [...prev, group])
    setShowCreate(false)
  }

  // After joining a group, fetch its full details and add to list
  async function handleJoined(groupId: string) {
    setShowJoin(false)
    const res = await fetch(`/api/groups/${groupId}`)
    if (!res.ok) return
    const data = (await res.json()) as { group: GroupWithDetails }
    setGroups((prev) => {
      // Avoid duplicate if already in list
      if (prev.some((g) => g.id === groupId)) {
        return prev.map((g) => (g.id === groupId ? data.group : g))
      }
      return [...prev, data.group]
    })
  }

  const hasGroups = groups.length > 0

  return (
    <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
      {/* Join error from deep-link */}
      {joinError && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-xl px-4 py-3">
          {joinError}
        </div>
      )}

      {hasGroups ? (
        <>
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              currentUserId={currentUserId}
              onRefresh={handleRefresh}
              onDeleted={handleRemoved}
            />
          ))}

          <button
            onClick={() => setShowJoin(true)}
            className="w-full text-slate-400 text-sm py-3 text-center hover:text-white transition-colors"
          >
            + Join another group
          </button>
        </>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 px-2">
          <p className="text-slate-300 text-base font-medium">
            You&apos;re not in a Consistency Group yet.
          </p>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
            Groups are small — up to 10 people — and private. Everyone sees a
            simple circle each day. Nothing more.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs pt-2">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3.5 rounded-xl text-sm"
            >
              Create a group
            </button>
            <button
              onClick={() => setShowJoin(true)}
              className="w-full bg-[#1C2333] text-white font-medium py-3.5 rounded-xl text-sm"
            >
              Join a group with a code
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {showJoin && (
        <JoinGroupModal
          onClose={() => setShowJoin(false)}
          onJoined={handleJoined}
        />
      )}
    </div>
  )
}
