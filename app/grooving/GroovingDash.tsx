'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitCheckin } from '@/app/actions'
import type {
  Challenge, UserProfile, DayStatus, RewardType,
  PendingPulseCheck, PulseCheck as PulseCheckRecord, PulseState,
  DestinationGoal, FocusTop5Item, GroupWithMembers, PillarLevel,
} from '@/lib/types'
import type { PauseStatus } from '@/app/actions'
import AppHeader   from '@/components/shared/AppHeader'
import BottomNav   from '@/components/shared/BottomNav'
import type { BottomNavTab } from '@/components/shared/BottomNav'
import GroupView          from '@/components/groups/GroupView'
import ChallengeGoalsTab  from '@/components/challenge/ChallengeGoalsTab'
import PauseChallenge       from '@/components/grooving/PauseChallenge'
import PausedState          from '@/components/grooving/PausedState'
import PauseReturn          from '@/components/grooving/PauseReturn'
import GroovingVideoSection from '@/components/grooving/GroovingVideoSection'
import GroovingHeader       from '@/components/grooving/GroovingHeader'
import GroovingCompletionScreen from '@/components/grooving/GroovingCompletionScreen'
import HabitCalendar        from '@/components/grooving/HabitCalendar'
import DestinationGoalLayer from '@/components/grooving/DestinationGoalLayer'
import FocusExerciseModal   from '@/components/grooving/FocusExerciseModal'
import PulseCheckCard          from '@/components/jamming/PulseCheck'
import WeeklyReflectionFlow   from '@/components/grooving/WeeklyReflectionFlow'
import NotificationBanner   from '@/components/jamming/NotificationBanner'
import DayCheckIn           from '@/components/challenge/DayCheckIn'
import RewardUnlock         from '@/components/challenge/RewardUnlock'
import VideoLibraryTab      from '@/components/shared/VideoLibraryTab'

interface Props {
  challenge:        Challenge
  profile:          UserProfile
  dayStatuses:      Record<string, DayStatus>
  pillarDayData:    Record<string, Record<string, boolean>>
  todayCompletions: Record<string, boolean>
  streak:           number
  dayNumber:        number
  today:            string
  earnedRewards:    RewardType[]
  pendingPulse:     PendingPulseCheck | null
  pulseHistory:     PulseCheckRecord[]
  newPillars:       string[]
  destinationGoals: DestinationGoal[]
  focusTop5:        FocusTop5Item[] | null
  groups:           GroupWithMembers[]
  pauseStatus:          PauseStatus
  watchedVideoIds:      string[]
  patternAlertDay:      string | null
  rootedMilestoneToday: boolean
  pillarLevels:         PillarLevel[]
  lastPillarCheckAt:    string | null
}

export default function GroovingDash({
  challenge, profile, dayStatuses, pillarDayData, todayCompletions, streak, dayNumber, today,
  earnedRewards, pendingPulse, pulseHistory, newPillars, destinationGoals, focusTop5, groups,
  pauseStatus, watchedVideoIds, patternAlertDay, rootedMilestoneToday,
  pillarLevels, lastPillarCheckAt,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [completions, setCompletions]               = useState<Record<string, boolean>>(todayCompletions)
  const [newRewards, setNewRewards]                 = useState<RewardType[]>([])
  const [showPulse, setShowPulse]                   = useState(!!pendingPulse)
  const [showComplete, setShowComplete]             = useState(false)
  const [soloingEligible, setSoloingEligible]       = useState(false)
  const [activeTab, setActiveTab]                   = useState<'today' | 'calendar' | 'groups' | 'videos' | 'goals'>('today')
  const [showFocusExercise, setShowFocusExercise]   = useState(false)
  const [forceOpenDestination, setForceOpenDest]    = useState(false)
  const [showPause, setShowPause]                   = useState(false)

  const [showPauseReturn, setShowPauseReturn] = useState(() => {
    if (typeof window === 'undefined') return false
    if (pauseStatus.isPaused)                return false
    if (!pauseStatus.pauseRecord?.resumed_at) return false
    return !sessionStorage.getItem(`pause_return_seen_${challenge.id}`)
  })

  const pillars      = profile.selected_pillars
  const durationDays = challenge.duration_days
  const pillarGoals  = Object.fromEntries(
    Object.entries(challenge.pillar_goals).map(([k, v]) => [k, String(v)])
  )

  const alreadySaved  = pillars.every(p => todayCompletions[p])
  const todayComplete = pillars.every(p => completions[p])
  const isDay1 = dayNumber === 1 && !alreadySaved
  const lastPulseState = pulseHistory.length > 0
    ? pulseHistory[pulseHistory.length - 1].pulse_state as PulseState
    : null

  function handleToggle(pillar: string) {
    if (alreadySaved) return
    setCompletions(prev => ({ ...prev, [pillar]: !prev[pillar] }))
  }

  function handleSave() {
    startTransition(async () => {
      const { newRewards: awarded, soloingEligible: eligible, groovingComplete } = await submitCheckin({
        date:         today,
        challengeId:  challenge.id,
        startDate:    challenge.start_date,
        endDate:      challenge.end_date,
        completions,
        dayNumber,
        durationDays: challenge.duration_days,
        level:        challenge.level,
      })

      if (groovingComplete) {
        setSoloingEligible(eligible)
        setShowComplete(true)
      } else if (awarded.length > 0) {
        setNewRewards(awarded)
      }

      setActiveTab('today')
      router.refresh()
    })
  }

  function handleFocusSaved(top5: FocusTop5Item[]) {
    setShowFocusExercise(false)
    if (destinationGoals.length > 0) {
      setForceOpenDest(true)
    }
    router.refresh()
  }

  const PILLAR_LABEL: Record<string, string> = {
    spiritual: 'Spiritual', physical: 'Physical', nutritional: 'Nutritional', personal: 'Personal',
  }
  const PILLAR_COLOR_CLASS: Record<string, string> = {
    spiritual: 'text-blue-700', physical: 'text-emerald-700',
    nutritional: 'text-amber-700', personal: 'text-green-700',
  }

  // ── Bottom nav mapping ─────────────────────────────────────────────────────
  const bottomTab: BottomNavTab =
    activeTab === 'groups'   ? 'groups'  :
    activeTab === 'calendar' ? 'history' :
    activeTab === 'videos'   ? 'videos'  :
    activeTab === 'goals'    ? 'goals'   :
    'dashboard'
  const disabledBottomTabs: BottomNavTab[] = pauseStatus.isPaused ? ['history'] : []
  function handleBottomTab(tab: BottomNavTab) {
    if (tab === 'groups')        setActiveTab('groups')
    else if (tab === 'history')  setActiveTab('calendar')
    else if (tab === 'videos')   setActiveTab('videos')
    else if (tab === 'goals')    setActiveTab('goals')
    else                         setActiveTab('today')
  }

  return (
    <div className="min-h-screen text-[var(--text-primary)]" style={{ backgroundColor: 'var(--app-bg)' }}>
      <AppHeader />
      <div className="max-w-lg mx-auto px-5 pt-4 pb-20 space-y-6">

        <GroovingHeader
          dayNumber={dayNumber}
          durationDays={durationDays}
          pillars={pillars}
          streak={streak}
          todayComplete={todayComplete && alreadySaved}
          whatChanged={profile.what_changed_reflection}
        />

        {/* ── TODAY TAB ── */}
        {activeTab === 'today' && (
          <>
            {pauseStatus.isPaused && (
              <PausedState
                challengeId={challenge.id}
                purposeStatement={profile.purpose_statement}
                pauseRecord={pauseStatus.pauseRecord}
                onResumed={() => router.refresh()}
              />
            )}

            {!pauseStatus.isPaused && (
              <>
                <NotificationBanner
                  checkInComplete={alreadySaved}
                  notificationTier={profile.notification_tier}
                  dayNumber={dayNumber}
                  durationDays={challenge.duration_days}
                  pillars={pillars}
                  missedYesterday={false}
                  level={3}
                  patternAlertDay={patternAlertDay}
                  rootedMilestoneToday={rootedMilestoneToday}
                  pillarLevels={pillarLevels}
                  onPatternAlertCta={() => setActiveTab('calendar')}
                />

                {isDay1 && newPillars.length > 0 && (
                  <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-violet-700">
                      New pillar{newPillars.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-[var(--text-primary)] text-sm font-semibold leading-relaxed">
                      Today you&apos;re tracking{' '}
                      {newPillars
                        .map(p => (
                          <span key={p} className={`font-black ${PILLAR_COLOR_CLASS[p] ?? ''}`}>
                            {PILLAR_LABEL[p] ?? p}
                          </span>
                        ))
                        .reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, ' + ', el], [])}
                      {' '}for the first time.
                    </p>
                    <p className="text-violet-600 text-xs leading-relaxed">
                      It&apos;s supposed to feel harder before it feels easier. That&apos;s not failure — that&apos;s growth.
                    </p>
                  </div>
                )}

                {!focusTop5 && (
                  <button
                    onClick={() => setShowFocusExercise(true)}
                    className="w-full flex items-center gap-3 bg-white border border-[var(--card-border)]
                      rounded-2xl px-5 py-4 text-left hover:border-gray-400 transition-colors"
                  >
                    <span className="text-xl">🎯</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] text-sm font-semibold">25/5 Focus Exercise</p>
                      <p className="text-[var(--text-secondary)] text-xs mt-0.5">
                        Identify what matters most — takes 5 minutes
                      </p>
                    </div>
                    <span className="text-[var(--text-muted)] text-sm shrink-0">→</span>
                  </button>
                )}

                <DestinationGoalLayer
                  rootedMilestoneFired={profile.rooted_milestone_fired}
                  destinationGoals={destinationGoals}
                  pillars={pillars}
                  challengeId={challenge.id}
                  focusTop5={focusTop5}
                  watchedVideoIds={watchedVideoIds}
                  forceOpenSetup={forceOpenDestination}
                  onForceOpenHandled={() => setForceOpenDest(false)}
                  onGoalsUpdated={() => router.refresh()}
                />

                {showPulse && pendingPulse && (
                  pendingPulse.triggerType === 'scheduled_weekly'
                    ? <WeeklyReflectionFlow
                        challengeId={challenge.id}
                        weekNumber={pendingPulse.weekNumber}
                        pillars={pillars}
                        pillarDayData={pillarDayData}
                        startDate={challenge.start_date}
                        destinationGoals={destinationGoals}
                        level={3}
                        watchedVideoIds={watchedVideoIds}
                        pillarLevels={pillarLevels}
                        lastPillarCheckAt={lastPillarCheckAt}
                        onDone={() => { setShowPulse(false); router.refresh() }}
                      />
                    : <PulseCheckCard
                        challengeId={challenge.id}
                        weekNumber={pendingPulse.weekNumber}
                        triggerType={pendingPulse.triggerType}
                        onDone={() => { setShowPulse(false); router.refresh() }}
                      />
                )}

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

                <GroovingVideoSection
                  pauseRecord={pauseStatus.pauseRecord}
                  watchedVideoIds={watchedVideoIds}
                />

                {!pauseStatus.pauseUsed && (
                  <div className="border-t border-[var(--card-border)] pt-3">
                    <button
                      onClick={() => setShowPause(true)}
                      className="w-full flex items-center justify-between py-2 px-1
                        text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs font-semibold
                        transition-colors group"
                    >
                      <span>Pause my challenge</span>
                      <span className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">⏸</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── CALENDAR TAB ── */}
        {activeTab === 'calendar' && (
          <HabitCalendar
            startDate={challenge.start_date}
            durationDays={durationDays}
            pillars={pillars}
            pillarDayData={pillarDayData}
            dayNumber={dayNumber}
            today={today}
            todayCompletions={completions}
            watchedVideoIds={watchedVideoIds}
          />
        )}

        {/* ── GROUPS TAB ── */}
        {activeTab === 'groups' && (
          <GroupView groups={groups} />
        )}

        {/* ── VIDEOS TAB ── */}
        {activeTab === 'videos' && (
          <VideoLibraryTab
            level={3}
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

      {showFocusExercise && (
        <FocusExerciseModal
          onSaved={handleFocusSaved}
          onClose={() => setShowFocusExercise(false)}
          watchedVideoIds={watchedVideoIds}
        />
      )}

      {newRewards.length > 0 && (
        <RewardUnlock rewards={newRewards} onDismiss={() => setNewRewards([])} />
      )}

      {showComplete && (
        <GroovingCompletionScreen
          daysCompleted={challenge.days_completed}
          durationDays={durationDays}
          consistencyPct={Math.round(challenge.consistency_pct)}
          pillars={pillars}
          soloingEligible={soloingEligible}
          focusTop5={profile.focus_top_5}
          destinationGoals={destinationGoals}
          pillarDayData={pillarDayData}
          startDate={challenge.start_date}
          challengeId={challenge.id}
          whatChangedReflection={profile.what_changed_reflection}
          rootedMilestoneDate={profile.rooted_milestone_date}
          rootedGoalId={profile.rooted_goal_id}
          watchedVideoIds={watchedVideoIds}
        />
      )}

      {showPauseReturn && (
        <PauseReturn
          challengeId={challenge.id}
          daysPaused={pauseStatus.pauseRecord?.days_paused ?? null}
          dayNumber={dayNumber}
          purposeStatement={profile.purpose_statement}
          newEndDate={challenge.end_date}
          onDismiss={() => setShowPauseReturn(false)}
        />
      )}

      {showPause && (
        <PauseChallenge
          challengeId={challenge.id}
          dayNumber={dayNumber}
          streak={streak}
          endDate={challenge.end_date}
          watchedVideoIds={watchedVideoIds}
          onPaused={() => { setShowPause(false); router.refresh() }}
          onClose={() => setShowPause(false)}
        />
      )}

      <BottomNav activeTab={bottomTab} onTab={handleBottomTab} disabledTabs={disabledBottomTabs} />
    </div>
  )
}
