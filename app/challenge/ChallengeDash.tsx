'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitCheckin } from '@/app/actions'
import type { Challenge, UserProfile, DayStatus, RewardType, GroupWithMembers, ChallengeEntry, PillarLevel, PillarName } from '@/lib/types'
import { resolveNextPillarInvitation } from '@/lib/next-pillar-invitation'
import AppHeader        from '@/components/shared/AppHeader'
import BottomNav        from '@/components/shared/BottomNav'
import type { BottomNavTab } from '@/components/shared/BottomNav'
import GroupView        from '@/components/groups/GroupView'
import StreakHeader     from '@/components/challenge/StreakHeader'
import ChallengeMap     from '@/components/challenge/ChallengeMap'
import DayCheckIn       from '@/components/challenge/DayCheckIn'
import EarnedBadges     from '@/components/challenge/EarnedBadges'
import RewardUnlock     from '@/components/challenge/RewardUnlock'
import TuningComplete   from '@/components/challenge/TuningComplete'
import VideoSection     from '@/components/challenge/VideoSection'
import HistoryList      from '@/components/challenge/HistoryList'
import ChallengeGoalsTab  from '@/components/challenge/ChallengeGoalsTab'
import VideoLibraryTab    from '@/components/shared/VideoLibraryTab'

interface Props {
  challenge:         Challenge
  profile:           UserProfile
  entries:           ChallengeEntry[]
  dayStatuses:       Record<string, DayStatus>
  todayCompletions:  Record<string, boolean>
  streak:            number
  dayNumber:         number
  today:             string
  earnedRewards:     RewardType[]
  watchedVideoIds:   string[]
  groups:            GroupWithMembers[]
  pillarLevels:      PillarLevel[]
}

type ActiveTab = 'today' | 'history' | 'groups' | 'videos' | 'goals'

export default function ChallengeDash({
  challenge, profile, entries, dayStatuses, todayCompletions, streak, dayNumber, today,
  earnedRewards, watchedVideoIds, groups, pillarLevels,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [completions, setCompletions]   = useState<Record<string, boolean>>(todayCompletions)
  const [activeTab, setActiveTab]       = useState<ActiveTab>('today')
  const [newRewards, setNewRewards]     = useState<RewardType[]>([])
  const [showDay7, setShowDay7]         = useState(false)
  const [invitedPillar, setInvitedPillar] = useState<PillarName | null>(null)

  // History edit state
  const [historyEditDate, setHistoryEditDate]             = useState<string | null>(null)
  const [historyEditCompletions, setHistoryEditCompletions] = useState<Record<string, boolean>>({})

  const pillars     = profile.selected_pillars
  const pillarGoals = Object.fromEntries(
    Object.entries(challenge.pillar_goals).map(([k, v]) => [k, String(v)])
  )
  const alreadySaved  = pillars.every(p => todayCompletions[p])
  const todayComplete = pillars.every(p => completions[p])

  const pillarStates = challenge.pillar_level_snapshot
    ? Object.fromEntries(
        Object.entries(challenge.pillar_level_snapshot).map(([k, v]) => [k, v.state])
      )
    : undefined

  function handleToggle(pillar: string) {
    if (alreadySaved) return
    setCompletions(prev => ({ ...prev, [pillar]: !prev[pillar] }))
  }

  function handleSave() {
    startTransition(async () => {
      const { newRewards: awarded } = await submitCheckin({
        date:         today,
        challengeId:  challenge.id,
        startDate:    challenge.start_date,
        endDate:      challenge.end_date,
        completions,
        dayNumber,
        durationDays: challenge.duration_days,
        level:        challenge.level,
      })

      if (awarded.includes('day7_complete') || awarded.includes('tuning_badge')) {
        setInvitedPillar(resolveNextPillarInvitation(pillarLevels))
        setShowDay7(true)
      } else if (awarded.length > 0) {
        setNewRewards(awarded)
      }

      setActiveTab('today')
      router.refresh()
    })
  }

  // ── History edit ─────────────────────────────────────────────────────────────

  function handleOpenHistoryEdit(date: string, completions: Record<string, boolean>) {
    setHistoryEditDate(date)
    setHistoryEditCompletions(completions)
  }

  function handleHistoryEditToggle(pillar: string) {
    setHistoryEditCompletions(prev => ({ ...prev, [pillar]: !prev[pillar] }))
  }

  function handleHistoryEditSave() {
    if (!historyEditDate) return
    const editMs  = new Date(historyEditDate + 'T00:00:00').getTime()
    const startMs = new Date(challenge.start_date + 'T00:00:00').getTime()
    const editDay = Math.max(Math.floor((editMs - startMs) / 86400000) + 1, 1)

    startTransition(async () => {
      await submitCheckin({
        date:         historyEditDate,
        challengeId:  challenge.id,
        startDate:    challenge.start_date,
        endDate:      challenge.end_date,
        completions:  historyEditCompletions,
        dayNumber:    editDay,
        durationDays: challenge.duration_days,
        level:        challenge.level,
      })
      setHistoryEditDate(null)
      router.refresh()
    })
  }

  // ── Bottom nav ───────────────────────────────────────────────────────────────

  const bottomTab: BottomNavTab =
    activeTab === 'groups'  ? 'groups'  :
    activeTab === 'history' ? 'history' :
    activeTab === 'videos'  ? 'videos'  :
    activeTab === 'goals'   ? 'goals'   :
    'dashboard'

  function handleBottomTab(tab: BottomNavTab) {
    setHistoryEditDate(null)
    if (tab === 'groups')       setActiveTab('groups')
    else if (tab === 'history') setActiveTab('history')
    else if (tab === 'videos')  setActiveTab('videos')
    else if (tab === 'goals')   setActiveTab('goals')
    else                        setActiveTab('today')
  }

  return (
    <div className="min-h-screen text-[var(--text-primary)]" style={{ backgroundColor: 'var(--app-bg)' }}>
      <AppHeader />
      <div className="max-w-lg mx-auto px-5 pt-4 pb-20 space-y-6">

        {/* Level context */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Level 1 — Tuning
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {challenge.days_completed}/7 days complete
          </p>
        </div>

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'today' && (
          <>
            <StreakHeader
              dayNumber={dayNumber}
              completions={completions}
              purposeStatement={profile.purpose_statement}
              todayComplete={todayComplete && alreadySaved}
            />
            <ChallengeMap
              startDate={challenge.start_date}
              dayNumber={dayNumber}
              dayStatuses={dayStatuses}
            />
            <EarnedBadges earned={earnedRewards} />
            <DayCheckIn
              pillars={pillars}
              pillarGoals={pillarGoals}
              completions={completions}
              isPending={isPending}
              alreadySaved={alreadySaved}
              onToggle={handleToggle}
              onSave={handleSave}
              pillarStates={pillarStates}
            />
            <VideoSection
              dayNumber={dayNumber}
              selectedPillars={pillars}
              watchedVideoIds={watchedVideoIds}
            />
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          historyEditDate ? (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setHistoryEditDate(null)}
                  className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  ← Back
                </button>
                <p className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">
                  Editing Day{' '}
                  {Math.max(Math.floor((new Date(historyEditDate + 'T00:00:00').getTime() - new Date(challenge.start_date + 'T00:00:00').getTime()) / 86400000) + 1, 1)}
                  {' · '}
                  {new Date(historyEditDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <DayCheckIn
                pillars={pillars}
                pillarGoals={pillarGoals}
                completions={historyEditCompletions}
                isPending={isPending}
                alreadySaved={false}
                onToggle={handleHistoryEditToggle}
                onSave={handleHistoryEditSave}
                pillarStates={pillarStates}
              />
            </>
          ) : (
            <HistoryList
              startDate={challenge.start_date}
              entries={entries}
              pillars={pillars}
              today={today}
              onEdit={handleOpenHistoryEdit}
            />
          )
        )}

        {/* ── GROUPS TAB ── */}
        {activeTab === 'groups' && (
          <GroupView groups={groups} />
        )}

        {/* ── VIDEOS TAB ── */}
        {activeTab === 'videos' && (
          <VideoLibraryTab
            level={1}
            dayNumber={dayNumber}
            selectedPillars={pillars}
            watchedVideoIds={watchedVideoIds}
            lastPulseState={null}
          />
        )}

        {/* ── GOALS TAB ── */}
        {activeTab === 'goals' && (
          <ChallengeGoalsTab
            challenge={challenge}
            pillars={pillars}
            pillarGoals={pillarGoals}
            onSaved={() => router.refresh()}
          />
        )}

      </div>

      {newRewards.length > 0 && (
        <RewardUnlock rewards={newRewards} onDismiss={() => setNewRewards([])} />
      )}

      {showDay7 && (
        <TuningComplete
          daysCompleted={challenge.days_completed}
          consistencyPct={Math.round(challenge.consistency_pct)}
          pillars={pillars}
          pillarGoals={pillarGoals}
          invitedPillar={invitedPillar}
          pillarLevels={pillarLevels}
        />
      )}

      <BottomNav activeTab={bottomTab} onTab={handleBottomTab} />
    </div>
  )
}
