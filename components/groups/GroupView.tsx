'use client'

// =============================================================================
// GroupView — Phase 2.5 (Step 16h — multi-group support)
//
// Renders the Group tab inside each level dashboard.
//
//   groups.length === 0  → empty state (create / join)
//   groups.length === 1  → single GroupCard, no selector
//   groups.length > 1    → horizontal pill selector + GroupCard for selected group
//
// The "Join another group" footer is always shown when the user is below the
// MAX_GROUPS_PER_USER limit.  At the limit it is replaced by an informational note.
// =============================================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GroupWithMembers, ConsistencyGroup } from '@/lib/types'
import { MAX_GROUPS_PER_USER } from '@/lib/constants'
import GroupCard         from './GroupCard'
import GroupManageModal  from './GroupManageModal'
import CreateGroupModal  from './CreateGroupModal'
import JoinGroupModal    from './JoinGroupModal'

interface Props {
  groups: GroupWithMembers[]
}

export default function GroupView({ groups }: Props) {
  const router = useRouter()

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showCreate, setShowCreate]       = useState(false)
  const [showJoin, setShowJoin]           = useState(false)
  const [showManage, setShowManage]       = useState(false)

  // Clamp index in case groups array shrinks (e.g. after leaving/deleting)
  const safeIndex    = Math.min(selectedIndex, Math.max(groups.length - 1, 0))
  const activeGroup  = groups[safeIndex] ?? null
  const atGroupLimit = groups.length >= MAX_GROUPS_PER_USER

  function handleGroupMutated(_group: ConsistencyGroup) {
    setShowCreate(false)
    setShowJoin(false)
    router.refresh()
  }

  function handleManageClose() {
    setShowManage(false)
    router.refresh()
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (groups.length === 0) {
    return (
      <>
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl">👥</p>
            <p className="text-white font-bold text-base">No group yet</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              A Consistency Group lets a few trusted people see that you showed up today —
              nothing more. No scores. No pressure. Just witnessed consistency.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full py-3 bg-violet-700 hover:bg-violet-600 text-white font-bold
                rounded-2xl transition-colors text-sm active:scale-95"
            >
              Create a group
            </button>
            <button
              onClick={() => setShowJoin(true)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold
                rounded-2xl transition-colors text-sm active:scale-95"
            >
              Join a group
            </button>
          </div>
        </div>

        {showCreate && (
          <CreateGroupModal
            onCreated={handleGroupMutated}
            onClose={() => setShowCreate(false)}
          />
        )}
        {showJoin && (
          <JoinGroupModal
            onJoined={handleGroupMutated}
            onClose={() => setShowJoin(false)}
          />
        )}
      </>
    )
  }

  // ── One or more groups ──────────────────────────────────────────────────────
  return (
    <>
      {/* ── Group selector — only shown when user belongs to more than one group ── */}
      {groups.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {groups.map((g, i) => (
            <button
              key={g.id}
              onClick={() => setSelectedIndex(i)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold
                transition-colors whitespace-nowrap
                ${i === safeIndex
                  ? 'bg-violet-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Active group card ─────────────────────────────────────────────────── */}
      {activeGroup && (
        <GroupCard
          group={activeGroup}
          onManage={() => setShowManage(true)}
        />
      )}

      {/* ── Join footer ───────────────────────────────────────────────────────── */}
      {atGroupLimit ? (
        <p className="text-center text-slate-600 text-xs py-2">
          You are in the maximum number of groups ({MAX_GROUPS_PER_USER}).
        </p>
      ) : (
        <button
          onClick={() => setShowJoin(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-slate-600
            hover:text-slate-400 text-xs font-semibold transition-colors"
        >
          <span>+</span> Join another group
        </button>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {showJoin && (
        <JoinGroupModal
          onJoined={handleGroupMutated}
          onClose={() => setShowJoin(false)}
        />
      )}

      {showManage && activeGroup && (
        <GroupManageModal
          group={activeGroup}
          onClose={handleManageClose}
        />
      )}
    </>
  )
}
