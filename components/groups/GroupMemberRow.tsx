import type { GroupMemberWithStatus, CompletionStatus } from '@/lib/types'

// ── Completion indicator ──────────────────────────────────────────────────────

interface IndicatorProps {
  status:              CompletionStatus | null  // null = no check-in row yet
  isCurrentUser:       boolean
  isAfterGracePeriod:  boolean
}

function CompletionIndicator({ status, isCurrentUser, isAfterGracePeriod }: IndicatorProps) {
  const effective = status ?? 'none'

  if (effective === 'full') {
    return <span className="text-emerald-400 text-base leading-none">✓</span>
  }

  if (effective === 'partial') {
    return (
      <svg viewBox="0 0 16 16" className="w-4 h-4 text-amber-400" fill="currentColor">
        {/* Left half-circle = partial */}
        <path d="M8 2a6 6 0 0 0 0 12V2z" />
      </svg>
    )
  }

  // 'none' — only visible after 9 pm (grace period) or on your own row
  if (isCurrentUser || isAfterGracePeriod) {
    return (
      <svg viewBox="0 0 16 16" className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="5.5" />
      </svg>
    )
  }

  return null
}

// ── Row ───────────────────────────────────────────────────────────────────────

interface Props {
  member:             GroupMemberWithStatus
  isAfterGracePeriod: boolean
}

export default function GroupMemberRow({ member, isAfterGracePeriod }: Props) {
  const status = member.todayStatus?.completion_status ?? null

  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${
      member.isCurrentUser ? 'bg-slate-800/60' : ''
    }`}>

      {/* Name */}
      <p className={`flex-1 min-w-0 text-sm truncate ${
        member.isCurrentUser ? 'text-white font-semibold' : 'text-slate-300 font-medium'
      }`}>
        {member.display_name}
        {member.isCurrentUser && (
          <span className="text-slate-500 font-normal"> (you)</span>
        )}
      </p>

      {/* Completion indicator */}
      <div className="w-5 flex justify-center shrink-0">
        <CompletionIndicator
          status={status}
          isCurrentUser={member.isCurrentUser ?? false}
          isAfterGracePeriod={isAfterGracePeriod}
        />
      </div>

    </div>
  )
}
