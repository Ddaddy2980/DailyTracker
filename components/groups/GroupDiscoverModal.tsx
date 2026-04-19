'use client'

import { useState, useRef, useEffect } from 'react'
import type { DiscoverResult } from '@/app/api/groups/discover/route'

type RequestState = 'idle' | 'sending' | 'sent'

interface GroupDiscoverModalProps {
  onClose:   () => void
  onRequest: (groupId: string) => void
}

export default function GroupDiscoverModal({ onClose, onRequest }: GroupDiscoverModalProps) {
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<DiscoverResult[]>([])
  const [searching, setSearching]   = useState(false)
  const [searched, setSearched]     = useState(false)
  const [requestStates, setRequestStates] = useState<Record<string, RequestState>>({})
  const [error, setError]           = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const isUsernameSearch = query.trim().startsWith('@')

  function handleQueryChange(val: string) {
    setQuery(val)
    setError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (val.trim().length === 0 || (val.trim() === '@')) {
      setResults([])
      setSearched(false)
      return
    }

    // Need at least 1 char after @ or 1 char for name search
    const effective = val.trim().startsWith('@') ? val.trim().slice(1) : val.trim()
    if (effective.length === 0) { setResults([]); setSearched(false); return }

    setSearching(true)
    debounceRef.current = setTimeout(() => search(val.trim()), 400)
  }

  async function search(q: string) {
    try {
      const res  = await fetch(`/api/groups/discover?q=${encodeURIComponent(q)}`)
      const data = await res.json() as { groups: DiscoverResult[] }
      setResults(data.groups ?? [])
    } catch {
      setError('Search failed. Try again.')
    } finally {
      setSearching(false)
      setSearched(true)
    }
  }

  async function handleRequest(groupId: string) {
    setRequestStates((prev) => ({ ...prev, [groupId]: 'sending' }))
    setError(null)

    const res = await fetch(`/api/groups/${groupId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'request' }),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      setError(data.error ?? 'Could not send request. Try again.')
      setRequestStates((prev) => ({ ...prev, [groupId]: 'idle' }))
      return
    }

    setRequestStates((prev) => ({ ...prev, [groupId]: 'sent' }))
    onRequest(groupId)
  }

  // For @username search, group results by owner
  const groupedByOwner = isUsernameSearch
    ? results.reduce<Record<string, DiscoverResult[]>>((acc, r) => {
        const key = r.owner_username
        if (!acc[key]) acc[key] = []
        acc[key].push(r)
        return acc
      }, {})
    : null

  const noResults = !searching && searched && results.length === 0
  const queryDisplay = query.trim()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#1C2333] rounded-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-white font-bold text-lg">Find a group</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Search by group name, or type{' '}
            <span className="text-slate-300 font-mono">@username</span>{' '}
            to find a specific person&apos;s groups.
          </p>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Group name or @username…"
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          className="w-full bg-[#2A3347] text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-slate-500"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {searching && (
          <p className="text-slate-400 text-sm text-center py-2">Searching…</p>
        )}

        {noResults && (
          <p className="text-slate-500 text-sm text-center py-2">
            No public groups found for &ldquo;{queryDisplay}&rdquo;.
          </p>
        )}

        {/* ── Username search results: grouped by owner ── */}
        {!searching && groupedByOwner && Object.keys(groupedByOwner).length > 0 && (
          <div className="space-y-4 max-h-72 overflow-y-auto">
            {Object.entries(groupedByOwner).map(([owner, ownerGroups]) => (
              <div key={owner}>
                <p className="text-slate-400 text-xs font-medium px-1 mb-1.5">
                  @{owner}&apos;s groups
                </p>
                <div className="space-y-2">
                  {ownerGroups.map((group) => (
                    <GroupResultRow
                      key={group.id}
                      group={group}
                      showOwner={false}
                      state={requestStates[group.id] ?? 'idle'}
                      onRequest={handleRequest}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Name search results: flat list with owner ── */}
        {!searching && !isUsernameSearch && results.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {results.map((group) => (
              <GroupResultRow
                key={group.id}
                group={group}
                showOwner
                state={requestStates[group.id] ?? 'idle'}
                onRequest={handleRequest}
              />
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#2A3347] text-slate-300 text-sm font-medium"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ── Shared result row ──────────────────────────────────────────────────────

interface GroupResultRowProps {
  group:     DiscoverResult
  showOwner: boolean
  state:     RequestState
  onRequest: (groupId: string) => void
}

function GroupResultRow({ group, showOwner, state, onRequest }: GroupResultRowProps) {
  return (
    <div className="flex items-center justify-between bg-[#2A3347] rounded-xl px-4 py-3">
      <div className="min-w-0 flex-1 mr-3">
        <p className="text-white text-sm font-medium truncate">{group.name}</p>
        <p className="text-slate-400 text-xs mt-0.5">
          {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
          {showOwner && (
            <span className="text-slate-500"> · @{group.owner_username}</span>
          )}
        </p>
      </div>
      <button
        onClick={() => onRequest(group.id)}
        disabled={state !== 'idle'}
        className={[
          'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
          state === 'sent'
            ? 'bg-emerald-700 text-emerald-200 cursor-default'
            : state === 'sending'
            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 text-white',
        ].join(' ')}
      >
        {state === 'sent' ? 'Requested' : state === 'sending' ? '…' : 'Request'}
      </button>
    </div>
  )
}
