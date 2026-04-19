'use client'

import { useState } from 'react'
import type { NotificationItem } from '@/app/api/groups/notifications/route'

interface GroupNotificationsCardProps {
  notifications:  NotificationItem[]
  onAccepted:     (groupId: string) => void
  onAllDismissed: () => void
}

export default function GroupNotificationsCard({
  notifications: initialNotifications,
  onAccepted,
  onAllDismissed,
}: GroupNotificationsCardProps) {
  const [items, setItems]         = useState(initialNotifications)
  const [responding, setResponding] = useState<Record<string, boolean>>({})

  async function respond(
    invitationId: string,
    groupId: string,
    action: 'accept' | 'decline'
  ) {
    setResponding((prev) => ({ ...prev, [invitationId]: true }))

    const res = await fetch(`/api/groups/invitations/${invitationId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })

    if (res.ok && action === 'accept') {
      onAccepted(groupId)
    }

    // Remove this item regardless of action or error
    const remaining = items.filter((n) => n.invitation.id !== invitationId)
    setItems(remaining)
    setResponding((prev) => ({ ...prev, [invitationId]: false }))

    if (remaining.length === 0) {
      onAllDismissed()
    }
  }

  if (items.length === 0) return null

  return (
    <div className="bg-[#1C2333] rounded-2xl overflow-hidden mb-1">
      <div className="px-4 pt-4 pb-2">
        <p className="text-slate-300 text-xs uppercase tracking-widest font-medium">
          Pending
        </p>
      </div>
      <div className="divide-y divide-[#2A3347]">
        {items.map((n) => {
          const isResponding = responding[n.invitation.id] ?? false
          const isRequest    = n.invitation.type === 'request'

          return (
            <div
              key={n.invitation.id}
              className="px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                {isRequest ? (
                  <>
                    <p className="text-white text-sm font-medium truncate">
                      @{n.from_username ?? 'someone'}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5 truncate">
                      wants to join {n.group_name}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-white text-sm font-medium truncate">
                      {n.group_name}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      You&apos;ve been invited to join
                    </p>
                  </>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => respond(n.invitation.id, n.invitation.group_id, 'decline')}
                  disabled={isResponding}
                  className="px-3 py-1.5 rounded-lg bg-[#2A3347] text-slate-300 text-xs font-medium disabled:opacity-40"
                >
                  Decline
                </button>
                <button
                  onClick={() => respond(n.invitation.id, n.invitation.group_id, 'accept')}
                  disabled={isResponding}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-40"
                >
                  {isResponding ? '…' : 'Accept'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
