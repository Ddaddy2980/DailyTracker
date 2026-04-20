'use client'

import { useState } from 'react'
import type { GroupWithDetails } from '@/lib/types'
import GroupManageSheet from './GroupManageSheet'

interface GroupCardProps {
  group: GroupWithDetails
  currentUserId: string
  onRefresh: (groupId: string) => void
  onDeleted: (groupId: string) => void
}

export default function GroupCard({
  group,
  currentUserId,
  onRefresh,
  onDeleted,
}: GroupCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const isCreator = group.user_id === currentUserId

  // Sort: current user first, rest alphabetical
  const sorted = [...group.members].sort((a, b) => {
    if (a.user_id === currentUserId) return -1
    if (b.user_id === currentUserId) return 1
    return a.display_name.localeCompare(b.display_name)
  })

  return (
    <>
      <div className="bg-[#1C2333] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <p className="text-white font-bold text-base leading-tight">{group.name}</p>
            <p className="text-slate-400 text-xs mt-0.5">
              {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
              {group.is_public === false && (
                <span className="ml-1 text-slate-500">· Private</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Manage button */}
            <button
              onClick={() => setSheetOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2A3347] text-slate-300 hover:text-white"
              aria-label="Manage group"
            >
              <span className="text-lg leading-none">···</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#2A3347] mx-4" />

        {/* Member rows */}
        <div className="px-4 py-2">
          {sorted.length === 0 ? (
            <p className="text-slate-500 text-sm py-2">No members yet.</p>
          ) : (
            sorted.map((member) => {
              const isMe = member.user_id === currentUserId
              return (
                <div
                  key={member.user_id}
                  className={`flex items-center justify-between py-2.5 ${
                    isMe ? 'opacity-100' : 'opacity-90'
                  }`}
                >
                  <span
                    className={`text-sm ${
                      isMe ? 'text-white font-medium' : 'text-slate-300'
                    }`}
                  >
                    {member.display_name}
                    {isMe && (
                      <span className="ml-2 text-xs text-slate-500 font-normal">You</span>
                    )}
                  </span>

                  {/* Check-in circle */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 transition-colors ${
                      member.completed_today
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'bg-transparent border-slate-600'
                    }`}
                  />
                </div>
              )
            })
          )}
        </div>

        {/* Waiting state when only 1 member */}
        {group.member_count === 1 && (
          <div className="px-4 pb-4 pt-1">
            <p className="text-slate-500 text-xs">
              {group.is_public === false
                ? 'Invite others by username from the manage menu.'
                : 'Others can find and request to join your group.'}
            </p>
          </div>
        )}
      </div>

      {sheetOpen && (
        <GroupManageSheet
          group={group}
          currentUserId={currentUserId}
          isCreator={isCreator}
          onClose={() => setSheetOpen(false)}
          onRefresh={() => {
            setSheetOpen(false)
            onRefresh(group.id)
          }}
          onDeleted={() => {
            setSheetOpen(false)
            onDeleted(group.id)
          }}
          onLeft={() => {
            setSheetOpen(false)
            onDeleted(group.id)
          }}
        />
      )}
    </>
  )
}
