'use client'

// =============================================================================
// GroupManageModal — Phase 2.5 (Step 16f)
//
// Opened by the ··· button in GroupCard.  Behaviour differs by role:
//
//   Creator view
//   ├── Rename group (inline input with live character counter)
//   ├── Invite code: copyable pill · Share link · Enable/disable toggle
//   ├── Members: each row has a Remove button with inline confirmation
//   └── Delete group → confirmation screen (replaces modal content)
//
//   Member view
//   └── Leave group → confirmation screen (replaces modal content)
//
// Confirmation screens use a full-content-swap pattern (no nested modal).
// =============================================================================

import { useState, useTransition } from 'react'
import type { GroupWithMembers, GroupMemberWithStatus } from '@/lib/types'
import {
  renameGroup,
  toggleGroupInviteUrl,
  removeMember,
  leaveGroup,
  deleteGroup,
  pauseGroup,
  resumeGroup,
  archiveGroup,
  reactivateGroup,
} from '@/app/actions-groups'

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalView =
  | 'main'
  | 'pause_confirm'
  | 'archive_confirm'
  | 'reactivate_confirm'
  | 'delete_confirm'
  | 'leave_confirm'

interface Props {
  group:   GroupWithMembers
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroupManageModal({ group, onClose }: Props) {
  // Determine role from the pre-tagged isCurrentUser flag set server-side
  const currentMember = group.members.find(m => m.isCurrentUser)
  const isCreator     = currentMember?.user_id === group.created_by

  const [view, setView]                     = useState<ModalView>('main')
  const [isPending, startTransition]        = useTransition()
  const [actionError, setActionError]       = useState<string | null>(null)

  // Rename state
  const [renameActive, setRenameActive]     = useState(false)
  const [renameValue, setRenameValue]       = useState(group.name)
  const [renameError, setRenameError]       = useState('')

  // Invite state — local mirror for optimistic toggle
  const [inviteEnabled, setInviteEnabled]   = useState(group.invite_url_enabled)
  const [shareFeedback, setShareFeedback]   = useState<'idle' | 'copied' | 'shared'>('idle')
  const [codeCopied, setCodeCopied]         = useState(false)

  // Remove-member confirmation state
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [removedIds, setRemovedIds]           = useState<Set<string>>(new Set())

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function run(action: () => Promise<void>, onSuccess?: () => void) {
    setActionError(null)
    startTransition(async () => {
      try {
        await action()
        onSuccess?.()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  // ── Rename ──────────────────────────────────────────────────────────────────

  function submitRename() {
    const trimmed = renameValue.trim()
    if (!trimmed)          { setRenameError('Name cannot be empty'); return }
    if (trimmed.length > 30) { setRenameError('Max 30 characters'); return }
    setRenameError('')
    run(
      () => renameGroup(group.id, trimmed),
      () => { setRenameActive(false) },
    )
  }

  // ── Invite ──────────────────────────────────────────────────────────────────

  function handleCopyCode() {
    void navigator.clipboard.writeText(group.invite_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  async function handleShareLink() {
    const url = `${window.location.origin}/join/${group.invite_code}`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: group.name, text: `Join my group on Daily Tracker: ${group.name}`, url })
        setShareFeedback('shared')
        setTimeout(() => setShareFeedback('idle'), 2000)
      } catch {
        // User cancelled or share not available — fall through to clipboard
        await copyInviteUrl(url)
      }
    } else {
      await copyInviteUrl(url)
    }
  }

  async function copyInviteUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setShareFeedback('copied')
    setTimeout(() => setShareFeedback('idle'), 2000)
  }

  function handleToggleInvite() {
    const next = !inviteEnabled
    setInviteEnabled(next)   // optimistic
    run(
      () => toggleGroupInviteUrl(group.id, next),
      undefined,
    )
  }

  // ── Remove member ───────────────────────────────────────────────────────────

  function handleConfirmRemove(targetUserId: string) {
    setConfirmRemoveId(null)
    // Optimistic removal
    setRemovedIds(prev => new Set([...prev, targetUserId]))
    run(
      () => removeMember(group.id, targetUserId),
      undefined,
    )
  }

  // ── Status transitions ───────────────────────────────────────────────────────

  function handlePause()      { run(() => pauseGroup(group.id),      () => onClose()) }
  function handleResume()     { run(() => resumeGroup(group.id),     () => onClose()) }
  function handleArchive()    { run(() => archiveGroup(group.id),    () => onClose()) }
  function handleReactivate() { run(() => reactivateGroup(group.id), () => onClose()) }

  // ── Delete / leave ──────────────────────────────────────────────────────────

  function handleDelete() {
    run(() => deleteGroup(group.id), () => onClose())
  }

  function handleLeave() {
    run(() => leaveGroup(group.id), () => onClose())
  }

  // ── Visible members (creator sees everyone except themselves; member sees nothing here) ──

  const otherMembers: GroupMemberWithStatus[] = group.members.filter(
    m => !m.isCurrentUser && !removedIds.has(m.user_id)
  )
  const totalActive = group.members.filter(m => m.active).length

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-4 sm:pb-0"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-white border border-[var(--card-border)] rounded-t-3xl sm:rounded-3xl
        max-h-[90vh] overflow-y-auto">

        {/* ── DELETE CONFIRMATION ──────────────────────────────────────────── */}
        {view === 'delete_confirm' && (
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <p className="text-[var(--text-primary)] font-bold text-lg">Delete this group?</p>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                This will permanently close{' '}
                <span className="text-[var(--text-primary)] font-semibold">{group.name}</span>{' '}
                for all {totalActive} member{totalActive !== 1 ? 's' : ''}.
                This cannot be undone.
              </p>
            </div>

            {actionError && (
              <p className="text-red-500 text-xs leading-snug bg-red-50 rounded-xl px-3 py-2">
                {actionError}
              </p>
            )}

            <div className="space-y-2 pt-1">
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-50
                  text-white font-bold rounded-2xl transition-colors text-sm active:scale-95"
              >
                {isPending ? 'Deleting…' : 'Delete permanently'}
              </button>
              <button
                onClick={() => { setView('main'); setActionError(null) }}
                disabled={isPending}
                className="w-full py-3 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── LEAVE CONFIRMATION ───────────────────────────────────────────── */}
        {view === 'leave_confirm' && (
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <p className="text-[var(--text-primary)] font-bold text-lg">Leave this group?</p>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                You will no longer see{' '}
                <span className="text-[var(--text-primary)] font-semibold">{group.name}</span>{' '}
                or its members&apos; check-ins.
              </p>
            </div>

            {actionError && (
              <p className="text-red-500 text-xs leading-snug bg-red-50 rounded-xl px-3 py-2">
                {actionError}
              </p>
            )}

            <div className="space-y-2 pt-1">
              <button
                onClick={handleLeave}
                disabled={isPending}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-50
                  text-white font-bold rounded-2xl transition-colors text-sm active:scale-95"
              >
                {isPending ? 'Leaving…' : 'Leave group'}
              </button>
              <button
                onClick={() => { setView('main'); setActionError(null) }}
                disabled={isPending}
                className="w-full py-3 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── PAUSE CONFIRMATION ───────────────────────────────────────────── */}
        {view === 'pause_confirm' && (
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <p className="text-[var(--text-primary)] font-bold text-lg">Pause this group?</p>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Members will see the group as paused. Check-ins won&apos;t update until you resume.
              </p>
            </div>

            {actionError && (
              <p className="text-red-500 text-xs leading-snug bg-red-50 rounded-xl px-3 py-2">
                {actionError}
              </p>
            )}

            <div className="space-y-2 pt-1">
              <button
                onClick={handlePause}
                disabled={isPending}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50
                  text-white font-bold rounded-2xl transition-colors text-sm active:scale-95"
              >
                {isPending ? 'Pausing…' : 'Confirm'}
              </button>
              <button
                onClick={() => { setView('main'); setActionError(null) }}
                disabled={isPending}
                className="w-full py-3 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── ARCHIVE CONFIRMATION ──────────────────────────────────────────── */}
        {view === 'archive_confirm' && (
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <p className="text-[var(--text-primary)] font-bold text-lg">Archive this group?</p>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Your group and its history are saved. You can reactivate it anytime.
              </p>
            </div>

            {actionError && (
              <p className="text-red-500 text-xs leading-snug bg-red-50 rounded-xl px-3 py-2">
                {actionError}
              </p>
            )}

            <div className="space-y-2 pt-1">
              <button
                onClick={handleArchive}
                disabled={isPending}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50
                  text-white font-bold rounded-2xl transition-colors text-sm active:scale-95"
              >
                {isPending ? 'Archiving…' : 'Archive'}
              </button>
              <button
                onClick={() => { setView('main'); setActionError(null) }}
                disabled={isPending}
                className="w-full py-3 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── REACTIVATE CONFIRMATION ───────────────────────────────────────── */}
        {view === 'reactivate_confirm' && (
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <p className="text-[var(--text-primary)] font-bold text-lg">Reactivate this group?</p>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                This will reopen{' '}
                <span className="text-[var(--text-primary)] font-semibold">{group.name}</span>{' '}
                for all previous members. Their invite code will work again.
              </p>
            </div>

            {actionError && (
              <p className="text-red-500 text-xs leading-snug bg-red-50 rounded-xl px-3 py-2">
                {actionError}
              </p>
            )}

            <div className="space-y-2 pt-1">
              <button
                onClick={handleReactivate}
                disabled={isPending}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50
                  text-white font-bold rounded-2xl transition-colors text-sm active:scale-95"
              >
                {isPending ? 'Reactivating…' : 'Reactivate'}
              </button>
              <button
                onClick={() => { setView('main'); setActionError(null) }}
                disabled={isPending}
                className="w-full py-3 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── MAIN VIEW ────────────────────────────────────────────────────── */}
        {view === 'main' && (
          <div className="p-6 space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[var(--text-primary)] font-bold text-base truncate">{group.name}</p>
                <p className="text-[var(--text-muted)] text-xs">
                  {totalActive} member{totalActive !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-3 shrink-0 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Global action error */}
            {actionError && (
              <p className="text-red-500 text-xs leading-snug bg-red-50 rounded-xl px-3 py-2">
                {actionError}
              </p>
            )}

            {/* ── CREATOR SECTIONS ─────────────────────────────────────────── */}
            {isCreator && (
              <>
                {/* ── Rename ─────────────────────────────────────────────── */}
                <section className="space-y-2">
                  <SectionLabel>Group name</SectionLabel>

                  {renameActive ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={e => { setRenameValue(e.target.value); setRenameError('') }}
                          onKeyDown={e => e.key === 'Enter' && submitRename()}
                          maxLength={30}
                          className="w-full bg-gray-100 border border-[var(--card-border)] focus:border-violet-500
                            rounded-xl px-4 py-3 pr-14 text-[var(--text-primary)] text-sm placeholder-gray-400
                            focus:outline-none transition-colors"
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs
                          ${renameValue.trim().length > 27 ? 'text-amber-500' : 'text-[var(--text-muted)]'}`}>
                          {renameValue.trim().length}/30
                        </span>
                      </div>
                      {renameError && (
                        <p className="text-red-500 text-xs pl-1">{renameError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={submitRename}
                          disabled={isPending}
                          className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50
                            text-white font-bold rounded-xl text-sm transition-colors"
                        >
                          {isPending ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={() => { setRenameActive(false); setRenameValue(group.name); setRenameError('') }}
                          className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-[var(--text-secondary)]
                            font-semibold rounded-xl text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRenameActive(true)}
                      className="w-full flex items-center justify-between bg-gray-100 hover:bg-gray-200
                        border border-[var(--card-border)] rounded-xl px-4 py-3 transition-colors"
                    >
                      <span className="text-[var(--text-primary)] text-sm truncate">{group.name}</span>
                      <span className="text-[var(--text-muted)] text-xs shrink-0 ml-2">Edit</span>
                    </button>
                  )}
                </section>

                {/* ── Invite code ────────────────────────────────────────── */}
                <section className="space-y-3">
                  <SectionLabel>Invite code</SectionLabel>

                  {/* Code pill */}
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 border border-[var(--card-border)]
                      rounded-xl px-4 py-3 w-full transition-colors"
                  >
                    <span className="text-[var(--text-primary)] font-mono font-bold tracking-widest text-sm flex-1 text-left">
                      {group.invite_code}
                    </span>
                    <span className="text-[var(--text-muted)] text-xs shrink-0">
                      {codeCopied ? '✓ Copied' : '⎘ Copy'}
                    </span>
                  </button>

                  {/* Share link button */}
                  <button
                    onClick={() => void handleShareLink()}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600
                      hover:bg-violet-500 text-white font-bold rounded-xl text-sm transition-colors
                      active:scale-95"
                  >
                    <span>↗</span>
                    {shareFeedback === 'copied'
                      ? 'Link copied!'
                      : shareFeedback === 'shared'
                        ? 'Shared!'
                        : 'Share invite link'}
                  </button>

                  {/* Enable/disable toggle */}
                  <div className="flex items-center justify-between bg-gray-100 border border-[var(--card-border)]
                    rounded-xl px-4 py-3">
                    <div className="space-y-0.5">
                      <p className="text-[var(--text-primary)] text-sm font-semibold">Invite link</p>
                      <p className="text-[var(--text-muted)] text-xs">
                        {inviteEnabled ? 'Anyone with the link can join' : 'Link is disabled'}
                      </p>
                    </div>
                    <button
                      onClick={handleToggleInvite}
                      disabled={isPending}
                      role="switch"
                      aria-checked={inviteEnabled}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-3
                        ${inviteEnabled ? 'bg-violet-600' : 'bg-gray-300'}
                        disabled:opacity-50`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                        ${inviteEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </section>

                {/* ── Members ────────────────────────────────────────────── */}
                {otherMembers.length > 0 && (
                  <section className="space-y-2">
                    <SectionLabel>Members</SectionLabel>

                    <div className="space-y-1">
                      {otherMembers.map(member => (
                        <MemberRemoveRow
                          key={member.id}
                          member={member}
                          isConfirming={confirmRemoveId === member.user_id}
                          isPending={isPending}
                          onRequestRemove={() => setConfirmRemoveId(member.user_id)}
                          onConfirmRemove={() => handleConfirmRemove(member.user_id)}
                          onCancelRemove={() => setConfirmRemoveId(null)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* ── Status actions + danger zone ────────────────────── */}
                <div className="space-y-2">

                  {/* Pause — active groups only */}
                  {group.status === 'active' && (
                    <button
                      onClick={() => { setView('pause_confirm'); setActionError(null) }}
                      disabled={isPending}
                      className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-left
                        bg-gray-100 hover:bg-gray-200 text-[var(--text-secondary)] transition-colors disabled:opacity-50"
                    >
                      Pause group
                    </button>
                  )}

                  {/* Resume — paused groups only (positive action, no confirm screen) */}
                  {group.status === 'paused' && (
                    <button
                      onClick={handleResume}
                      disabled={isPending}
                      className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-left
                        bg-gray-100 hover:bg-gray-200 text-[var(--text-secondary)] transition-colors disabled:opacity-50"
                    >
                      {isPending ? 'Resuming…' : 'Resume group'}
                    </button>
                  )}

                  {/* Archive — active or paused groups only */}
                  {(group.status === 'active' || group.status === 'paused') && (
                    <button
                      onClick={() => { setView('archive_confirm'); setActionError(null) }}
                      disabled={isPending}
                      className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-left
                        bg-gray-100 hover:bg-gray-200 text-[var(--text-secondary)] transition-colors disabled:opacity-50"
                    >
                      Archive group
                    </button>
                  )}

                  {/* Reactivate — archived groups only */}
                  {group.status === 'archived' && (
                    <button
                      onClick={() => { setView('reactivate_confirm'); setActionError(null) }}
                      disabled={isPending}
                      className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-left
                        bg-gray-100 hover:bg-gray-200 text-[var(--text-secondary)] transition-colors disabled:opacity-50"
                    >
                      Reactivate group
                    </button>
                  )}

                  {/* Divider before delete */}
                  <div className="border-t border-[var(--card-border)] pt-2 space-y-2">

                    {/* Archive nudge — only when there's something worth saving */}
                    {(group.status === 'active' || group.status === 'paused') && (
                      <p className="text-[var(--text-muted)] text-xs leading-relaxed px-1">
                        Consider archiving instead — your group history is saved and you can restart anytime.
                      </p>
                    )}

                    <button
                      onClick={() => { setView('delete_confirm'); setActionError(null) }}
                      disabled={isPending}
                      className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-left
                        bg-gray-100 hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                    >
                      Delete this group
                    </button>
                  </div>

                </div>
              </>
            )}

            {/* ── MEMBER SECTION ───────────────────────────────────────────── */}
            {!isCreator && (
              <div className="space-y-4">
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  You&apos;re a member of{' '}
                  <span className="text-[var(--text-primary)] font-semibold">{group.name}</span>.
                </p>

                <button
                  onClick={() => { setView('leave_confirm'); setActionError(null) }}
                  className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-left
                    bg-gray-100 hover:bg-red-50 text-red-500 transition-colors"
                >
                  Leave this group
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{children}</p>
  )
}

function MemberRemoveRow({
  member,
  isConfirming,
  isPending,
  onRequestRemove,
  onConfirmRemove,
  onCancelRemove,
}: {
  member:          GroupMemberWithStatus
  isConfirming:    boolean
  isPending:       boolean
  onRequestRemove: () => void
  onConfirmRemove: () => void
  onCancelRemove:  () => void
}) {
  return (
    <div className="bg-gray-100 rounded-xl px-4 py-3 space-y-2">
      {isConfirming ? (
        <>
          <p className="text-[var(--text-primary)] text-sm font-semibold">
            Remove <span className="text-amber-500">{member.display_name}</span> from this group?
          </p>
          <div className="flex gap-2">
            <button
              onClick={onConfirmRemove}
              disabled={isPending}
              className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50
                text-white font-bold rounded-lg text-xs transition-colors"
            >
              Remove
            </button>
            <button
              onClick={onCancelRemove}
              className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-[var(--text-secondary)]
                font-semibold rounded-lg text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-primary)] text-sm font-semibold truncate mr-3">
            {member.display_name}
          </span>
          <button
            onClick={onRequestRemove}
            className="text-[var(--text-muted)] hover:text-red-500 text-xs font-semibold
              transition-colors shrink-0"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}
