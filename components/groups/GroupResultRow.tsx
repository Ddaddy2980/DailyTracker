import type { DiscoverResult } from '@/app/api/groups/discover/route'

export type RequestState = 'idle' | 'sending' | 'sent'

interface GroupResultRowProps {
  group:     DiscoverResult
  showOwner: boolean
  state:     RequestState
  onRequest: (groupId: string) => void
}

export default function GroupResultRow({ group, showOwner, state, onRequest }: GroupResultRowProps) {
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
