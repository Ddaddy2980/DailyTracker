'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitCheckin, markVideoWatched } from '@/app/actions'
import type {
  Challenge, UserProfile, DayStatus, RewardType,
  PendingPulseCheck, PulseCheck as PulseCheckRecord, PulseState,
  DestinationGoal, FocusTop5Item, GroupWithMembers, ChallengeEntry,
  JourneyStatus, PendingJourneyEvent, VideoEntry,
  DurationGoalDestination, PillarLevel,
} from '@/lib/types'
import type { PauseStatus } from '@/app/actions'
import { VIDEO_LIBRARY, getDayVideoIds, getJammingVideoIds } from '@/lib/constants'
import AppHeader   from '@/components/shared/AppHeader'
import BottomNav   from '@/components/shared/BottomNav'
import type { BottomNavTab } from '@/components/shared/BottomNav'
import GroupView          from '@/components/groups/GroupView'
import ChallengeGoalsTab  from '@/components/challenge/ChallengeGoalsTab'
import ChallengeMap       from '@/components/challenge/ChallengeMap'
import DayCheckIn         from '@/components/challenge/DayCheckIn'
import PillarGoalCard      from '@/components/challenge/PillarGoalCard'
import EarnedBadges       from '@/components/challenge/EarnedBadges'
import RewardUnlock       from '@/components/challenge/RewardUnlock'
import HistoryList        from '@/components/challenge/HistoryList'
import VideoCard          from '@/components/challenge/VideoCard'
import VideoLibraryTab    from '@/components/shared/VideoLibraryTab'
import StreakHeader        from '@/components/challenge/StreakHeader'
import JammingHeader       from '@/components/jamming/JammingHeader'
import PulseCheckCard      from '@/components/jamming/PulseCheck'
import NotificationBanner  from '@/components/jamming/NotificationBanner'
import GroovingHeader        from '@/components/grooving/GroovingHeader'
import DestinationGoalLayer  from '@/components/grooving/DestinationGoalLayer'
import FocusExerciseModal    from '@/components/grooving/FocusExerciseModal'
import HabitCalendar         from '@/components/grooving/HabitCalendar'
import PauseChallenge        from '@/components/grooving/PauseChallenge'
import PausedState           from '@/components/grooving/PausedState'
import PauseReturn           from '@/components/grooving/PauseReturn'
import WeeklyReflectionFlow    from '@/components/grooving/WeeklyReflectionFlow'
import TuningEvaluationModal  from '@/components/journey/TuningEvaluationModal'
import JammingPhase2Modal     from '@/components/journey/JammingPhase2Modal'

// ── Video helper ─────────────────────────────────────────────────────────────

const B_PILLAR: Record<string, string> = {
  B1: 'spiritual', B2: 'physical', B3: 'nutritional', B4: 'personal',
}

/**
 * Returns the single VideoEntry to feature as "Today's Coaching" on the dashboard.
 * Priority by level:
 *   L1: day-triggered D-series → A/B/C fallback
 *   L2: day/pulse-triggered J-series → A/B/C fallback
 *   L3+: G5 Rooted (if today) → pulse G-series → remaining G-series → A/B/C
 * Returns null when all candidates have been watched.
 */
function getTodaysDashboardVideo(
  level:                number,
  daysInLevel:          number,
  watchedIds:           Set<string>,
  selectedPillars:      string[],
  lastPulseState:       PulseState | null,
  rootedMilestoneToday: boolean,
): VideoEntry | null {
  let candidates: string[] = []

  if (level === 1) {
    candidates = getDayVideoIds(daysInLevel, selectedPillars)
    const abcIds = VIDEO_LIBRARY
      .filter(v => ['A', 'B', 'C'].includes(v.module))
      .filter(v => v.module !== 'B' || selectedPillars.includes(B_PILLAR[v.id] ?? ''))
      .map(v => v.id)
    candidates = [...candidates, ...abcIds]
  } else if (level === 2) {
    candidates = getJammingVideoIds(daysInLevel, lastPulseState)
    const abcIds = VIDEO_LIBRARY
      .filter(v => ['A', 'B', 'C'].includes(v.module))
      .filter(v => v.module !== 'B' || selectedPillars.includes(B_PILLAR[v.id] ?? ''))
      .map(v => v.id)
    candidates = [...candidates, ...abcIds]
  } else {
    // Level 3+: milestone first, then pulse response, then remaining G-series, then A/B/C
    if (rootedMilestoneToday)                candidates.push('G5')
    if (lastPulseState === 'smooth_sailing')  candidates.push('G_SMOOTH')
    if (lastPulseState === 'rough_waters')    candidates.push('G_ROUGH')
    if (lastPulseState === 'taking_on_water') candidates.push('G_WATER')
    const gIds = VIDEO_LIBRARY
      .filter(v => v.module === 'G' && !candidates.includes(v.id))
      .map(v => v.id)
    const abcIds = VIDEO_LIBRARY
      .filter(v => ['A', 'B', 'C'].includes(v.module))
      .filter(v => v.module !== 'B' || selectedPillars.includes(B_PILLAR[v.id] ?? ''))
      .map(v => v.id)
    candidates = [...candidates, ...gIds, ...abcIds]
  }

  for (const id of candidates) {
    if (!watchedIds.has(id)) {
      const video = VIDEO_LIBRARY.find(v => v.id === id)
      if (video) return video
    }
  }
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  challenge:              Challenge
  profile:                UserProfile
  journeyStatus:          JourneyStatus
  entries:                ChallengeEntry[]
  dayStatuses:            Record<string, DayStatus>
  pillarDayData:          Record<string, Record<string, boolean>>
  todayCompletions:       Record<string, boolean>
  streak:                 number
  today:                  string
  earnedRewards:          RewardType[]
  pendingPulse:           PendingPulseCheck | null
  pulseHistory:           PulseCheckRecord[]
  destinationGoals:       DestinationGoal[]
  durationGoalsByPillar:  Record<string, DurationGoalDestination[]>
  pillarLevelsByPillar:   Record<string, PillarLevel>
  groups:                 GroupWithMembers[]
  pauseStatus:            PauseStatus
  watchedVideoIds:        string[]
  patternAlertDay:        string | null
  rootedMilestoneToday:   boolean
}

type ActiveTab = 'today' | 'history' | 'groups' | 'videos' | 'goals'

export default function JourneyDash({
  challenge, profile, journeyStatus, entries, dayStatuses, pillarDayData,
  todayCompletions, streak, today, earnedRewards, pendingPulse, pulseHistory,
  destinationGoals, durationGoalsByPillar, pillarLevelsByPillar,
  groups, pauseStatus, watchedVideoIds,
  patternAlertDay, rootedMilestoneToday,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [completions, setCompletions]             = useState<Record<string, boolean>>(todayCompletions)
  const [activeTab, setActiveTab]                 = useState<ActiveTab>('today')
  const [newRewards, setNewRewards]               = useState<RewardType[]>([])
  const [showPulse, setShowPulse]                 = useState(!!pendingPulse)
  const [showFocusExercise, setShowFocusExercise] = useState(false)
  const [forceOpenDestination, setForceOpenDest]  = useState(false)
  const [showPause, setShowPause]                 = useState(false)
  const [pendingJourneyEvent, setPendingJourneyEvent] = useState<PendingJourneyEvent | null>(
    challenge.pending_journey_event
  )
  const [localWatched, setLocalWatched]   = useState<Set<string>>(new Set(watchedVideoIds))
  const [, startVideoTransition]          = useTransition()

  const [showPauseReturn, setShowPauseReturn] = useState(() => {
    if (typeof window === 'undefined') return false
    if (pauseStatus.isPaused)                 return false
    if (!pauseStatus.pauseRecord?.resumed_at)  return false
    return !sessionStorage.getItem(`pause_return_seen_${challenge.id}`)
  })

  // History edit state
  const [historyEditDate, setHistoryEditDate]               = useState<string | null>(null)
  const [historyEditCompletions, setHistoryEditCompletions] = useState<Record<string, boolean>>({})

  const pillars     = profile.selected_pillars
  const pillarGoals = Object.fromEntries(
    Object.entries(challenge.pillar_goals).map(([k, v]) => [k, String(v)])
  )
  const durationDays = challenge.duration_days

  const { currentDay, daysInCurrentLevel } = journeyStatus

  // For legacy challenges (is_continuous = false), challenge.level may be stale from before
  // the Consistency Profile architecture. Override with the highest level across pillar_levels.
  const effectiveLevel = journeyStatus.isLegacy
    ? Math.max(1, ...Object.values(pillarLevelsByPillar).map(r => r.level))
    : journeyStatus.currentLevel
  const EFFECTIVE_LEVEL_NAMES: Record<number, string> = {
    1: 'Tuning', 2: 'Jamming', 3: 'Grooving', 4: 'Soloing', 5: 'Orchestrating',
  }
  const effectiveLevelName = EFFECTIVE_LEVEL_NAMES[effectiveLevel] ?? 'Tuning'

  const alreadySaved  = pillars.every(p => todayCompletions[p])
  const todayComplete = pillars.every(p => completions[p])
  const lastPulseState: PulseState | null = pulseHistory.length > 0
    ? pulseHistory[pulseHistory.length - 1].pulse_state as PulseState
    : null

  const todayVideo = getTodaysDashboardVideo(
    effectiveLevel, daysInCurrentLevel, localWatched, pillars, lastPulseState, rootedMilestoneToday,
  )

  // Duration of the current level phase (for level-relative headers / progress bars)
  //   L1: Days 1-7     = 7 days
  //   L2: Days 8-21    = 14 days
  //   L3: Days 22-60   = 39 days (or shorter if totalDays < 61)
  //   L4: Days 61-end  = remainder
  const levelDuration =
    effectiveLevel === 1 ? 7 :
    effectiveLevel === 2 ? 14 :
    effectiveLevel === 3 ? (durationDays >= 61 ? 39 : durationDays - 21) :
    durationDays - 60

  // ── History edit ─────────────────────────────────────────────────────────────

  function handleOpenHistoryEdit(date: string, dayCompletions: Record<string, boolean>) {
    setHistoryEditDate(date)
    setHistoryEditCompletions(dayCompletions)
  }

  function handleHistoryEditToggle(pillar: string) {
    setHistoryEditCompletions(prev => ({ ...prev, [pillar]: !prev[pillar] }))
  }

  function handleHistoryEditSave() {
    if (!historyEditDate) return
    startTransition(async () => {
      await submitCheckin({
        date:         historyEditDate,
        challengeId:  challenge.id,
        startDate:    challenge.start_date,
        endDate:      challenge.end_date,
        completions:  historyEditCompletions,
        dayNumber:    currentDay,
        durationDays: durationDays,
        level:        effectiveLevel,
      })
      setHistoryEditDate(null)
      router.refresh()
    })
  }

  // ── Focus exercise (Level 3) ──────────────────────────────────────────────

  function handleFocusSaved(_top5: FocusTop5Item[]) {
    setShowFocusExercise(false)
    if (destinationGoals.length > 0) setForceOpenDest(true)
    router.refresh()
  }

  function handleVideoWatched(id: string) {
    setLocalWatched(prev => new Set([...prev, id]))
    startVideoTransition(async () => {
      await markVideoWatched(id, 'journey_dashboard')
    })
  }

  // ── Bottom nav ───────────────────────────────────────────────────────────────

  const bottomTab: BottomNavTab =
    activeTab === 'groups'  ? 'groups'  :
    activeTab === 'history' ? 'history' :
    activeTab === 'videos'  ? 'videos'  :
    activeTab === 'goals'   ? 'goals'   :
    'dashboard'

  const disabledBottomTabs: BottomNavTab[] = pauseStatus.isPaused ? ['history'] : []

  function handleBottomTab(tab: BottomNavTab) {
    if      (tab === 'groups')  setActiveTab('groups')
    else if (tab === 'history') setActiveTab('history')
    else if (tab === 'videos')  setActiveTab('videos')
    else if (tab === 'goals')   setActiveTab('goals')
    else                        setActiveTab('today')
  }

  // ── Level header ─────────────────────────────────────────────────────────────

  function renderHeader() {
    if (effectiveLevel === 1) {
      return (
        <div className="space-y-1">
          <StreakHeader
            dayNumber={daysInCurrentLevel}
            completions={completions}
            purposeStatement={profile.purpose_statement}
            todayComplete={false}
            showCompleteBadge={todayComplete && alreadySaved}
          />
          <p className="text-xs text-[var(--text-muted)]">
            Your {durationDays}-day journey · {effectiveLevelName} phase
          </p>
        </div>
      )
    }
    if (effectiveLevel === 2) {
      return (
        <div className="space-y-1">
          <JammingHeader
            dayNumber={daysInCurrentLevel}
            durationDays={levelDuration}
            pillars={pillars}
            streak={streak}
            purposeStatement={profile.purpose_statement}
            todayComplete={todayComplete && alreadySaved}
          />
          <p className="text-xs text-[var(--text-muted)]">
            Your {durationDays}-day journey · {effectiveLevelName} phase
          </p>
        </div>
      )
    }
    if (effectiveLevel === 3) {
      return (
        <div className="space-y-1">
          <GroovingHeader
            dayNumber={daysInCurrentLevel}
            durationDays={levelDuration}
            pillars={pillars}
            streak={streak}
            todayComplete={todayComplete && alreadySaved}
            whatChanged={profile.what_changed_reflection}
          />
          <p className="text-xs text-[var(--text-muted)]">
            Your {durationDays}-day journey · {effectiveLevelName} phase
          </p>
        </div>
      )
    }
    // Level 4 — Soloing
    return (
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-600">
          Level 4 — {effectiveLevelName}
        </p>
        <h1 className="text-2xl font-black text-[var(--text-primary)]">
          Day {currentDay}/{durationDays}
        </h1>
        {streak > 0 && (
          <p className="text-sm text-[var(--text-secondary)]">{streak}-day streak</p>
        )}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-[var(--text-primary)]" style={{ backgroundColor: 'var(--app-bg)' }}>
      <AppHeader />
      <div className="max-w-lg mx-auto px-5 pt-4 pb-20 space-y-3">

        {renderHeader()}

        {/* ── TODAY TAB ── */}
        {activeTab === 'today' && (
          <>
            {/* Pause state (Level 3+) */}
            {effectiveLevel >= 3 && pauseStatus.isPaused && (
              <PausedState
                challengeId={challenge.id}
                purposeStatement={profile.purpose_statement}
                pauseRecord={pauseStatus.pauseRecord}
                onResumed={() => router.refresh()}
              />
            )}

            {(!pauseStatus.isPaused || effectiveLevel < 3) && (
              <>
                {/* Notification banner (Level 2+) */}
                {effectiveLevel >= 2 && (
                  <NotificationBanner
                    checkInComplete={alreadySaved}
                    notificationTier={profile.notification_tier}
                    dayNumber={currentDay}
                    pillars={pillars}
                    missedYesterday={false}
                    level={effectiveLevel}
                    patternAlertDay={effectiveLevel >= 3 ? patternAlertDay : null}
                    rootedMilestoneToday={effectiveLevel >= 3 && rootedMilestoneToday}
                    onPatternAlertCta={() => setActiveTab('history')}
                  />
                )}

                {/* Level 3: Focus Exercise + Destination Goals */}
                {effectiveLevel === 3 && (
                  <>
                    {!profile.focus_top_5 && (
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
                      focusTop5={profile.focus_top_5}
                      watchedVideoIds={watchedVideoIds}
                      forceOpenSetup={forceOpenDestination}
                      onForceOpenHandled={() => setForceOpenDest(false)}
                      onGoalsUpdated={() => router.refresh()}
                    />
                  </>
                )}

                {/* Pulse check / weekly reflection (Level 2+) */}
                {effectiveLevel >= 2 && showPulse && pendingPulse && (
                  effectiveLevel >= 3 && pendingPulse.triggerType === 'scheduled_weekly'
                    ? <WeeklyReflectionFlow
                        challengeId={challenge.id}
                        weekNumber={pendingPulse.weekNumber}
                        pillars={pillars}
                        pillarDayData={pillarDayData}
                        startDate={challenge.start_date}
                        destinationGoals={destinationGoals}
                        durationGoalDestinations={Object.values(durationGoalsByPillar).flat()}
                        level={3}
                        watchedVideoIds={watchedVideoIds}
                        pillarLevels={[]}
                        lastPillarCheckAt={null}
                        onDone={() => { setShowPulse(false); router.refresh() }}
                      />
                    : <PulseCheckCard
                        challengeId={challenge.id}
                        weekNumber={pendingPulse.weekNumber}
                        triggerType={pendingPulse.triggerType}
                        onDone={() => { setShowPulse(false); router.refresh() }}
                      />
                )}

                {/* Level 1: challenge map + earned badges */}
                {effectiveLevel === 1 && (
                  <div className="space-y-2">
                    <ChallengeMap
                      startDate={challenge.start_date}
                      dayNumber={daysInCurrentLevel}
                      dayStatuses={dayStatuses}
                      compact
                    />
                    <EarnedBadges earned={earnedRewards} compact />
                  </div>
                )}

                {/* Per-pillar goal cards */}
                {(effectiveLevel < 2 || !showPulse) && (
                  <div className="space-y-2">
                    {pillars.map(pillar => (
                      <PillarGoalCard
                        key={pillar}
                        pillar={pillar}
                        goals={[pillarGoals[pillar] ?? ''].filter(Boolean)}
                        savedCompletions={completions}
                        challengeId={challenge.id}
                        startDate={challenge.start_date}
                        endDate={challenge.end_date}
                        date={today}
                        dayNumber={currentDay}
                        durationDays={durationDays}
                        level={effectiveLevel}
                        onSaved={(delta) => setCompletions(prev => ({ ...prev, ...delta }))}
                      />
                    ))}
                  </div>
                )}

                {/* Today's coaching — single recommended video */}
                {todayVideo && (
                  <section className="space-y-3">
                    <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
                      Today&apos;s coaching
                    </p>
                    <VideoCard
                      video={todayVideo}
                      watched={localWatched.has(todayVideo.id)}
                      onWatched={handleVideoWatched}
                    />
                  </section>
                )}

                {/* Pause button (Level 3+, one-use) */}
                {effectiveLevel >= 3 && !pauseStatus.pauseUsed && (
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

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && effectiveLevel >= 3 && (
          <HabitCalendar
            startDate={challenge.start_date}
            durationDays={durationDays}
            pillars={pillars}
            pillarDayData={pillarDayData}
            dayNumber={currentDay}
            today={today}
            todayCompletions={completions}
            watchedVideoIds={watchedVideoIds}
          />
        )}
        {activeTab === 'history' && effectiveLevel < 3 && (
          <>
            {historyEditDate ? (
              <DayCheckIn
                pillars={pillars}
                pillarGoals={pillarGoals}
                completions={historyEditCompletions}
                isPending={isPending}
                alreadySaved={false}
                onToggle={handleHistoryEditToggle}
                onSave={handleHistoryEditSave}
              />
            ) : (
              <HistoryList
                startDate={challenge.start_date}
                entries={entries}
                pillars={pillars}
                today={today}
                onEdit={handleOpenHistoryEdit}
              />
            )}
          </>
        )}

        {/* ── GROUPS TAB ── */}
        {activeTab === 'groups' && (
          <GroupView groups={groups} />
        )}

        {/* ── VIDEOS TAB ── */}
        {activeTab === 'videos' && (
          <VideoLibraryTab
            level={Math.min(effectiveLevel, 3) as 1 | 2 | 3}
            dayNumber={currentDay}
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
            durationGoalsByPillar={durationGoalsByPillar}
            pillarLevelsByPillar={pillarLevelsByPillar}
            onSaved={() => router.refresh()}
            videoG6bTriggered={profile.video_g6b_triggered}
          />
        )}

      </div>

      {/* ── Overlays ── */}

      {effectiveLevel >= 3 && showFocusExercise && (
        <FocusExerciseModal
          onSaved={handleFocusSaved}
          onClose={() => setShowFocusExercise(false)}
          watchedVideoIds={watchedVideoIds}
        />
      )}

      {newRewards.length > 0 && (
        <RewardUnlock rewards={newRewards} onDismiss={() => setNewRewards([])} />
      )}

      {/* ── Part F: pending journey event modals ── */}
      {pendingJourneyEvent?.type === 'tuning_evaluation' &&
        pendingJourneyEvent.outcome &&
        pendingJourneyEvent.message && (
        <TuningEvaluationModal
          challengeId={challenge.id}
          outcome={pendingJourneyEvent.outcome}
          message={pendingJourneyEvent.message}
          tuningDaysCompleted={challenge.tuning_days_completed}
          onDismiss={() => { setPendingJourneyEvent(null); router.refresh() }}
        />
      )}
      {pendingJourneyEvent?.type === 'jamming_phase2_offer' && (
        <JammingPhase2Modal
          challengeId={challenge.id}
          unlocked={pendingJourneyEvent.unlock ?? false}
          onDismiss={() => { setPendingJourneyEvent(null); router.refresh() }}
        />
      )}

      {effectiveLevel >= 3 && showPauseReturn && (
        <PauseReturn
          challengeId={challenge.id}
          daysPaused={pauseStatus.pauseRecord?.days_paused ?? null}
          dayNumber={currentDay}
          purposeStatement={profile.purpose_statement}
          newEndDate={challenge.end_date}
          onDismiss={() => setShowPauseReturn(false)}
        />
      )}

      {effectiveLevel >= 3 && showPause && (
        <PauseChallenge
          challengeId={challenge.id}
          dayNumber={currentDay}
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
