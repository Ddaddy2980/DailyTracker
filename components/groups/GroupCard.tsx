'use client'

import { useState, useEffect } from 'react'
import type { GroupWithMembers } from '@/lib/types'
import { clearJoinNotification, markFullGroupDayNotified } from '@/app/actions-groups'
import { todayStr } from '@/lib/constants'
import GroupMemberRow from './GroupMemberRow'

interface Props {
  group:          GroupWithMembers
  onManage:       () => void   // opens the manage sheet (Step 16f)
}

export default function GroupCard({ group, onManage }: Props) {
  // Grace period: 'none' status is hidden before 9 pm local time for other members
  const [isAfterGracePeriod, setIsAfterGracePeriod] = useState(false)
  const [copied, setCopied] = useState(false)

  // ── Join notification banner (creator only) ───────────────────────────────
  const isCreator = group.members.find(m => m.isCurrentUser)?.user_id === group.created_by
  const showJoinBanner =
    isCreator &&
    !!group.pendingJoinNotification &&
    group.pendingJoinNotification.seenAt === null
  const [joinBannerDismissed, setJoinBannerDismissed] = useState(false)

  function handleDismissJoinBanner() {
    setJoinBannerDismissed(true)
    void clearJoinNotification(group.id)
  }

  // ── Full-group-day banner (all members) ──────────────────────────────────
  const today            = todayStr()
  const flags            = group.group_daily_flags
  const showFullGroupDay =
    !!flags &&
    flags.date === today &&
    !flags.notified

  // Fire-and-forget: mark as notified once on first render so it never repeats
  useEffect(() => {
    if (showFullGroupDay) {
      void markFullGroupDayNotified(group.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFullGroupDay, group.id])

  useEffect(() => {
    function checkTime() {
      setIsAfterGracePeriod(new Date().getHours() >= 21)
    }
    checkTime()
    // Re-evaluate every minute so the state flips live at 9 pm
    const id = setInterval(checkTime, 60_000)
    return () => clearInterval(id)
  }, [])

  function handleCopyCode() {
    void navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeCount = group.members.filter(m => m.active).length
  const fullToday   = group.members.every(
    m => m.todayStatus?.completion_status === 'full'
  )

  return (
    <div className="bg-white border border-[var(--card-border)] rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-[var(--card-border)]">
        <div className="space-y-0.5 min-w-0">
          <p className="text-[var(--text-primary)] font-bold text-sm truncate">{group.name}</p>
          <p className="text-[var(--text-secondary)] text-xs">{activeCount} member{activeCount !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          {/* Invite code pill + copy */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200
              rounded-lg px-2.5 py-1 transition-colors"
            title="Copy invite code"
          >
            <span className="text-xs font-mono font-bold text-[var(--text-primary)] tracking-wider">
              {group.invite_code}
            </span>
            <span className="text-[var(--text-muted)] text-xs">{copied ? '✓' : '⎘'}</span>
          </button>

          {/* Manage button */}
          <button
            onClick={onManage}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm transition-colors px-1"
            title="Manage group"
          >
            ···
          </button>
        </div>
      </div>

      {/* ── Join notification banner (creator only, dismissible) ─────────── */}
      {showJoinBanner && !joinBannerDismissed && group.pendingJoinNotification && (
        <div className="bg-violet-50 border-b border-violet-100 px-4 py-2.5
          flex items-center justify-between gap-3">
          <p className="text-violet-700 text-xs font-semibold leading-snug">
            {group.pendingJoinNotification.memberName} just joined {group.pendingJoinNotification.groupName}.
          </p>
          <button
            onClick={handleDismissJoinBanner}
            className="text-violet-400 hover:text-violet-600 text-sm shrink-0 transition-colors"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Full-group-day celebration banner (all members, auto-dismisses) ─ */}
      {showFullGroupDay && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5">
          <p className="text-emerald-600 text-xs font-bold text-center tracking-wide">
            🎉 Everyone in {group.name} showed up today. That&apos;s a full group day.
          </p>
        </div>
      )}

      {/* Full-group celebration banner (existing — driven by live member status) */}
      {fullToday && group.members.length > 1 && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2">
          <p className="text-emerald-600 text-xs font-bold text-center tracking-wide">
            🎉 Full group day — everyone showed up
          </p>
        </div>
      )}

      {/* Member list */}
      <div className="px-1 py-1 divide-y divide-slate-100">
        {group.members.map(member => (
          <GroupMemberRow
            key={member.id}
            member={member}
            isAfterGracePeriod={isAfterGracePeriod}
          />
        ))}
      </div>

      {/* Column labels — only shown when there are other members */}
      {group.members.length > 1 && (
        <div className="flex items-center gap-3 px-4 pb-2.5 pt-0">
          <span className="flex-1" />
          <span className="text-[var(--text-muted)] text-xs w-5 text-center">today</span>
        </div>
      )}

    </div>
  )
}
