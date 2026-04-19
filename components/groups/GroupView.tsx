'use client'

import { useState, useCallback } from 'react'
import type { GroupWithDetails } from '@/lib/types'
import type { NotificationItem } from '@/app/api/groups/notifications/route'
import GroupCard from './GroupCard'
import CreateGroupModal from './CreateGroupModal'
import GroupDiscoverModal from './GroupDiscoverModal'
import GroupNotificationsCard from './GroupNotificationsCard'

interface GroupViewProps {
  initialGroups: GroupWithDetails[]
  currentUserId: string
  joinError?: string | null
  initialNotifications?: NotificationItem[]
}

export default function GroupView({
  initialGroups,
  currentUserId,
  joinError,
  initialNotifications = [],
}: GroupViewProps) {
  const [groups, setGroups] = useState<GroupWithDetails[]>(initialGroups)
  const [showCreate, setShowCreate] = useState(false)
  const [showDiscover, setShowDiscover] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications)
  const [showNotifications, setShowNotifications] = useState(initialNotifications.length > 0)

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

  // After a join request is sent (from discover modal), nothing to do yet until accepted
  function handleRequest(_groupId: string) {
    setShowDiscover(false)
  }

  // After accepting a notification invitation, fetch the new group and add to list
  async function handleAccepted(groupId: string) {
    const res = await fetch(`/api/groups/${groupId}`)
    if (!res.ok) return
    const data = (await res.json()) as { group: GroupWithDetails }
    setGroups((prev) => {
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

      {/* Pending notifications (invitations + join requests) */}
      {showNotifications && notifications.length > 0 && (
        <GroupNotificationsCard
          notifications={notifications}
          onAccepted={handleAccepted}
          onAllDismissed={() => setShowNotifications(false)}
        />
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

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setShowCreate(true)}
              className="flex-1 text-slate-400 text-sm py-3 text-center hover:text-white transition-colors"
            >
              + Create a group
            </button>
            <button
              onClick={() => setShowDiscover(true)}
              className="flex-1 text-slate-400 text-sm py-3 text-center hover:text-white transition-colors"
            >
              + Find a group
            </button>
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 px-2">
          <p className="text-slate-300 text-base font-medium">
            You&apos;re not in a Consistency Group yet.
          </p>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
            Groups are small — up to 10 people. Everyone sees a simple circle
            each day. Nothing more.
          </p>
          <div className="flex gap-3 w-full max-w-xs pt-2">
            <button
              onClick={() => setShowCreate(true)}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3.5 rounded-xl text-sm"
            >
              + Create a group
            </button>
            <button
              onClick={() => setShowDiscover(true)}
              className="flex-1 bg-[#1C2333] text-white font-medium py-3.5 rounded-xl text-sm"
            >
              + Find a group
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
      {showDiscover && (
        <GroupDiscoverModal
          onClose={() => setShowDiscover(false)}
          onRequest={handleRequest}
        />
      )}
    </div>
  )
}
