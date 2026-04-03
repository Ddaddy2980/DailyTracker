'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitCheckin } from '@/app/actions'
import type {
  Challenge, UserProfile, DayStatus, RewardType,
  PendingPulseCheck, PulseCheck as PulseCheckRecord, PulseState,
  GroupWithMembers, ChallengeEntry, PillarLevel, PillarName,
} from '@/lib/types'
import { resolveNextPillarInvitation } from '@/lib/next-pillar-invitation'
import AppHeader          from '@/components/shared/AppHeader'
import BottomNav          from '@/components/shared/BottomNav'
import type { BottomNavTab } from '@/components/shared/BottomNav'
import GroupView          from '@/components/groups/GroupView'
import JammingHeader      from '@/components/jamming/JammingHeader'
import JammingMap         from '@/components/jamming/JammingMap'
import WeeklySummary      from '@/components/jamming/WeeklySummary'
import PulseCheckCard     from '@/components/jamming/PulseCheck'
import DayCheckIn         from '@/components/challenge/DayCheckIn'
import RewardUnlock       from '@/components/challenge/RewardUnlock'
import NotificationBanner from '@/components/jamming/NotificationBanner'
import JammingVideoSection from '@/components/jamming/JammingVideoSection'
import JammingComplete    from '@/components/jamming/JammingComplete'
import HistoryList        from '@/components/challenge/HistoryList'
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
  pendingPulse:      PendingPulseCheck | null
  pulseHistory:      PulseCheckRecord[]
  watchedVideoIds:   string[]
  groups:            GroupWithMembers[]
  pillarLevels:      PillarLevel[]
}

type ActiveTab = 'today' | 'history' | 'groups' | 'videos' | 'goals'

export default function JammingDash({
  challenge, profile, entries, dayStatuses, todayCompletions, streak, dayNumber, today,
  earnedRewards, pendingPulse, pulseHistory, watchedVideoIds, groups, pillarLevels,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [completions, setCompletions]         = useState<Record<string, boolean>>(todayCompletions)
  const [activeTab, setActiveTab]             = useState<ActiveTab>('today')
  const [newRewards, setNewRewards]           = useState<RewardType[]>([])
  const [showPulse, setShowPulse]             = useState(!!pendingPulse)
  const [showComplete, setShowComplete]         = useState(false)
  const [groovingEligible, setGroovingEligible] = useState(false)
  const [invitedPillar, setInvitedPillar]       = useState<PillarName | null>(null)

  // History edit state
  const [historyEditDate, setHistoryEditDate]               = useState<string | null>(null)
  const [historyEditCompletions, setHistoryEditCompletions] = useState<Record<string, boolean>>({})

  const pillars      = profile.selected_pillars
  const durationDays = challenge.duration_days
  const pillarGoals  = Object.fromEntries(
    Object.entries(challenge.pillar_goals).map(([k, v]) => [k, String(v)])
  )
  const alreadySaved  = pillars.every(p => todayCompletions[p])
  const todayComplete = pillars.every(p => completions[p])
  const weekNumber    = Math.ceil(dayNumber / 7)
  const lastPulseState = pulseHistory.length > 0
    ? pulseHistory[pulseHistory.length - 1].pulse_state as PulseState
    : null

  function handleToggle(pillar: string) {
    if (alreadySaved) return
    setCompletions(prev => ({ ...prev, [pillar]: !prev[pillar] }))
  }

  function handleSave() {
    startTransition(async () => {
      const { newRewards: awarded, groovingEligible: eligible } = await submitCheckin({
        date:         today,
        challengeId:  challenge.id,
        startDate:    challenge.start_date,
        endDate:      challenge.end_date,
        completions,
        dayNumber,
        durationDays: challenge.duration_days,
        level:        challenge.level,
      })

      if (awarded.includes('jamming_badge')) {
        setGroovingEligible(eligible)
        setInvitedPillar(resolveNextPillarInvitation(pillarLevels))
        setShowComplete(true)
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

        <JammingHeader
          dayNumber={dayNumber}
          durationDays={durationDays}
          pillars={pillars}
          streak={streak}
          purposeStatement={profile.purpose_statement}
          todayComplete={todayComplete && alreadySaved}
        />

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'today' && (
          <>
            <NotificationBanner
              checkInComplete={alreadySaved}
              notificationTier={profile.notification_tier}
              dayNumber={dayNumber}
              pillars={pillars}
              missedYesterday={false}
            />
            {showPulse && pendingPulse && (
              <PulseCheckCard
                challengeId={challenge.id}
                weekNumber={pendingPulse.weekNumber}
                triggerType={pendingPulse.triggerType}
                onDone={() => { setShowPulse(false); router.refresh() }}
              />
            )}
            <JammingMap
              startDate={challenge.start_date}
              durationDays={durationDays}
              dayStatuses={dayStatuses}
              dayNumber={dayNumber}
            />
            {!showPulse && (
              <DayCheckIn
                pillars={pillars}
                pillarGoals={pillarGoals}
                completions={completions}
                isPending={isPending}
                alreadySaved={alreadySaved}
                onToggle={handleToggle}
                onSave={handleSave}
              />
            )}
            <JammingVideoSection
              dayNumber={dayNumber}
              lastPulseState={lastPulseState}
              watchedVideoIds={watchedVideoIds}
            />
            {Array.from({ length: weekNumber - 1 }, (_, i) => i + 1).map(wk => (
              <WeeklySummary
                key={wk}
                weekNumber={wk}
                startDate={challenge.start_date}
                dayStatuses={dayStatuses}
                pillars={pillars}
                pulseHistory={pulseHistory}
              />
            ))}
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
            level={2}
            dayNumber={dayNumber}
            selectedPillars={pillars}
            watchedVideoIds={watchedVideoIds}
            lastPulseState={lastPulseState}
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

      {showComplete && (
        <JammingComplete
          daysCompleted={challenge.days_completed}
          durationDays={durationDays}
          consistencyPct={Math.round(challenge.consistency_pct)}
          pillars={pillars}
          pillarGoals={pillarGoals}
          pulseHistory={pulseHistory}
          groovingEligible={groovingEligible}
          invitedPillar={invitedPillar}
          pillarLevels={pillarLevels}
        />
      )}

      <BottomNav activeTab={bottomTab} onTab={handleBottomTab} />
    </div>
  )
}
