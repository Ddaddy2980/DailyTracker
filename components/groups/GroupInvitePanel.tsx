'use client'

import { useState, useEffect, useRef } from 'react'
import type { PendingInvitationItem } from '@/app/api/groups/[id]/invite/route'

interface GroupInvitePanelProps {
  groupId: string
}

type SearchState = 'idle' | 'searching' | 'found' | 'not_found' | 'self'

export default function GroupInvitePanel({ groupId }: GroupInvitePanelProps) {
  const [usernameInput, setUsernameInput]     = useState('')
  const [searchState, setSearchState]         = useState<SearchState>('idle')
  const [foundUserId, setFoundUserId]         = useState<string | null>(null)
  const [sending, setSending]                 = useState(false)
  const [sendError, setSendError]             = useState<string | null>(null)
  const [pending, setPending]                 = useState<PendingInvitationItem[]>([])
  const [loadingPending, setLoadingPending]   = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadPending()
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  async function loadPending() {
    setLoadingPending(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/invite`)
      if (!res.ok) return
      const data = await res.json() as { invitations: PendingInvitationItem[] }
      setPending(data.invitations ?? [])
    } catch {
      // non-critical — panel still usable
    } finally {
      setLoadingPending(false)
    }
  }

  function handleUsernameChange(val: string) {
    const normalized = val.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsernameInput(normalized)
    setSendError(null)
    setFoundUserId(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (normalized.length < 3) {
      setSearchState('idle')
      return
    }

    setSearchState('searching')
    debounceRef.current = setTimeout(() => searchUser(normalized), 400)
  }

  async function searchUser(username: string) {
    try {
      const res = await fetch(`/api/users/search?username=${encodeURIComponent(username)}`)
      if (res.status === 404) { setSearchState('not_found'); return }
      if (res.status === 400) { setSearchState('self'); return }
      if (!res.ok) { setSearchState('idle'); return }
      const data = await res.json() as { userId: string; username: string }
      setFoundUserId(data.userId)
      setSearchState('found')
    } catch {
      setSearchState('idle')
    }
  }

  async function handleSendInvitation() {
    if (!foundUserId || sending) return
    setSending(true)
    setSendError(null)

    const res = await fetch(`/api/groups/${groupId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'invitation', toUsername: usernameInput }),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      setSendError(data.error ?? 'Could not send invitation. Try again.')
      setSending(false)
      return
    }

    const data = await res.json() as { invitation: PendingInvitationItem['invitation'] }
    setPending((prev) => [
      ...prev,
      { invitation: data.invitation, to_username: usernameInput },
    ])
    setUsernameInput('')
    setSearchState('idle')
    setFoundUserId(null)
    setSending(false)
  }

  async function handleCancel(invitationId: string) {
    const res = await fetch(`/api/groups/${groupId}/invite`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId }),
    })
    if (res.ok) {
      setPending((prev) => prev.filter((p) => p.invitation.id !== invitationId))
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs uppercase tracking-widest px-1">
        Invite by Username
      </p>

      {/* Username search input */}
      <div className={[
        'flex items-center gap-2 bg-[#2A3347] rounded-xl px-4 py-3 border-2 transition-colors',
        searchState === 'found'     ? 'border-emerald-600'  :
        searchState === 'not_found' ? 'border-red-500/60'   :
        searchState === 'self'      ? 'border-amber-500/60' :
        'border-transparent',
      ].join(' ')}>
        <span className="text-slate-500 text-sm select-none">@</span>
        <input
          type="text"
          value={usernameInput}
          onChange={(e) => handleUsernameChange(e.target.value)}
          placeholder="username"
          maxLength={20}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-500"
        />
        {searchState === 'searching' && (
          <svg className="animate-spin h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {searchState === 'found' && (
          <span className="text-emerald-400 text-xs">Found</span>
        )}
      </div>

      {/* Status messages */}
      {searchState === 'not_found' && (
        <p className="text-red-400 text-xs px-1">No user with that username.</p>
      )}
      {searchState === 'self' && (
        <p className="text-amber-400 text-xs px-1">That&apos;s you.</p>
      )}
      {sendError && (
        <p className="text-red-400 text-xs px-1">{sendError}</p>
      )}

      <button
        onClick={handleSendInvitation}
        disabled={searchState !== 'found' || sending}
        className={[
          'w-full py-3 rounded-xl text-sm font-semibold transition-colors',
          searchState === 'found' && !sending
            ? 'bg-purple-600 hover:bg-purple-700 text-white'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed',
        ].join(' ')}
      >
        {sending ? 'Sending…' : 'Send Invitation'}
      </button>

      {/* Pending outgoing invitations */}
      {!loadingPending && pending.length > 0 && (
        <div className="pt-1 space-y-1">
          <p className="text-slate-500 text-xs px-1 mb-1.5">Pending</p>
          {pending.map((p) => (
            <div
              key={p.invitation.id}
              className="flex items-center justify-between bg-[#2A3347] rounded-xl px-4 py-2.5"
            >
              <span className="text-slate-300 text-sm">@{p.to_username}</span>
              <button
                onClick={() => handleCancel(p.invitation.id)}
                className="text-slate-500 hover:text-red-400 text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
