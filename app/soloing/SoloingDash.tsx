'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitCheckin } from '@/app/actions'
import type {
  Challenge, UserProfile, DayStatus, RewardType,
  PendingPulseCheck, DestinationGoal, GroupWithMembers,
  PillarLevel, DurationGoalDestination,
} from '@/lib/types'

import AppHeader   from '@/components/shared/AppHeader'
import BottomNav   from '@/components/shared/BottomNav'
import type { BottomNavTab } from '@/components/shared/BottomNav'
import GroupView             from '@/components/groups/GroupView'
import ChallengeGoalsTab     from '@/components/challenge/ChallengeGoalsTab'
import HabitCalendar         from '@/components/grooving/HabitCalendar'
import DestinationGoalLayer  from '@/components/grooving/DestinationGoalLayer'
import WeeklyReflectionFlow  from '@/components/grooving/WeeklyReflectionFlow'
import DayCheckIn            from '@/components/challenge/DayCheckIn'
import RewardUnlock          from '@/components/challenge/RewardUnlock'
import VideoLibraryTab       from '@/components/shared/VideoLibraryTab'
import SoloingHeader         from '@/components/soloing/SoloingHeader'
import SoloingCompletionScreen from '@/components/soloing/SoloingCompletionScreen'

interface Props {
  challenge:                Challenge
  profile:                  UserProfile
  dayStatuses:              Record<string, DayStatus>
  pillarDayData:            Record<string, Record<string, boolean>>
  todayCompletions:         Record<string, boolean>
  streak:                   number
  dayNumber:                number
  today:                    string
  earnedRewards:            RewardType[]
  pendingPulse:             PendingPulseCheck | null
  destinationGoals:         DestinationGoal[]
  destinationGoalsByPillar: Record<string, DurationGoalDestination[]>
  groups:                   GroupWithMembers[]
  watchedVideoIds:          string[]
  patternAlertDay:          string | null
  pillarLevels:             PillarLevel[]
  lastPillarCheckAt:        string | null
}

export default function SoloingDash({
  challenge, profile, dayStatuses, pillarDayData, todayCompletions, streak, dayNumber, today,
  earnedRewards, pendingPulse, destinationGoals, destinationGoalsByPillar,
  groups, watchedVideoIds, patternAlertDay, pillarLevels, lastPillarCheckAt,
}: Props) {
  void earnedRewards   // available for future use
  void patternAlertDay // available for future notification banner
  void dayStatuses     // used for streak calc in page.tsx

  const router = useRouter()
  const [, startTransition] = useTransition()

  const [completions, setCompletions]             = useState<Record<string, boolean>>(todayCompletions)
  const [newRewards, setNewRewards]               = useState<RewardType[]>([])
  const [showComplete, setShowComplete]           = useState(false)
  const [orchestratingEligible, setOrchestrating] = useState(false)
  const [advancingPillars, setAdvancingPillars]   = useState<string[]>([])
  const [showReflection, setShowReflection]       = useState(
    pendingPulse?.triggerType === 'scheduled_weekly'
  )
  const [activeTab, setActiveTab] = useState<'today' | 'calendar' | 'groups' | 'videos' | 'goals'>('today')

  const pillars      = profile.selected_pillars
  const durationDays = challenge.duration_days
  const pillarGoals  = Object.fromEntries(
    Object.entries(challenge.pillar_goals).map(([k, v]) => [k, String(v)])
  )
  const pillarLevelsByPillar = pillarLevels.reduce<Record<string, PillarLevel>>(
    (acc, pl) => { acc[pl.pillar] = pl; return acc },
    {}
  )

  const alreadySaved  = pillars.every(p => todayCompletions[p])
  const todayComplete = pillars.every(p => completions[p])

  // Ceiling Conversation trigger: all 5 canonical pillars at Soloing (level >= 4) or above.
  // Computed from pre-write pillarLevels — valid because advancing pillars were already level 4.
  const allPillarLevelsAtFour = pillarLevels.length >= 5 && pillarLevels.every(pl => pl.level >= 4)

  function handleToggle(pillar: string) {
    if (alreadySaved) return
    setCompletions(prev => ({ ...prev, [pillar]: !prev[pillar] }))
  }

  function handleSave() {
    startTransition(async () => {
      const result = await submitCheckin({
        date:         today,
        challengeId:  challenge.id,
        startDate:    challenge.start_date,
        endDate:      challenge.end_date,
        completions,
        dayNumber,
        durationDays: challenge.duration_days,
        level:        challenge.level,
      })

      if (result.soloingComplete) {
        setOrchestrating(result.orchestratingEligible)
        setAdvancingPillars(result.advancingPillars)
        setShowComplete(true)
      } else if (result.newRewards.length > 0) {
        setNewRewards(result.newRewards)
      }

      setActiveTab('today')
      router.refresh()
    })
  }

  function handlePillarSaved(delta: Record<string, boolean>, rewards?: RewardType[]) {
    setCompletions(prev => ({ ...prev, ...delta }))
    if (rewards?.includes('soloing_badge')) {
      // Completion triggered via individual pillar save. orchestratingEligible/advancingPillars
      // retain their last-set values (default false/[]). Edge case: see Known Deferred Items.
      setShowComplete(true)
    } else if (rewards && rewards.length > 0) {
      setNewRewards(rewards)
    }
    router.refresh()
  }

  // ── Bottom nav ────────────────────────────────────────────────────────────
  const bottomTab: BottomNavTab =
    activeTab === 'groups'   ? 'groups'  :
    activeTab === 'calendar' ? 'history' :
    activeTab === 'videos'   ? 'videos'  :
    activeTab === 'goals'    ? 'goals'   :
    'dashboard'

  function handleBottomTab(tab: BottomNavTab) {
    if (tab === 'groups')       setActiveTab('groups')
    else if (tab === 'history') setActiveTab('calendar')
    else if (tab === 'videos')  setActiveTab('videos')
    else if (tab === 'goals')   setActiveTab('goals')
    else                        setActiveTab('today')
  }

  return (
    <div className="min-h-screen text-[var(--text-primary)]" style={{ backgroundColor: 'var(--app-bg)' }}>
      <AppHeader />
      <div className="max-w-lg mx-auto px-5 pt-4 pb-20 space-y-6">

        <SoloingHeader
          dayNumber={dayNumber}
          durationDays={durationDays}
          pillars={pillars}
          streak={streak}
          todayComplete={todayComplete && alreadySaved}
        />

        {/* ── TODAY TAB ── */}
        {activeTab === 'today' && (
          <>
            {showReflection && pendingPulse?.triggerType === 'scheduled_weekly' && (
              <WeeklyReflectionFlow
                challengeId={challenge.id}
                weekNumber={pendingPulse.weekNumber}
                pillars={pillars}
                pillarDayData={pillarDayData}
                startDate={challenge.start_date}
                destinationGoals={destinationGoals}
                durationGoalDestinations={Object.values(destinationGoalsByPillar).flat()}
                level={3}
                watchedVideoIds={watchedVideoIds}
                pillarLevels={pillarLevels}
                lastPillarCheckAt={lastPillarCheckAt}
                onDone={() => { setShowReflection(false); router.refresh() }}
              />
            )}

            {!showReflection && (
              <>
                <DestinationGoalLayer
                  rootedMilestoneFired={true}
                  destinationGoals={destinationGoals}
                  pillars={pillars}
                  challengeId={challenge.id}
                  focusTop5={profile.focus_top_5}
                  watchedVideoIds={watchedVideoIds}
                  onGoalsUpdated={() => router.refresh()}
                />

                <DayCheckIn
                  pillars={pillars}
                  pillarGoals={pillarGoals}
                  completions={completions}
                  isPending={false}
                  alreadySaved={alreadySaved}
                  onToggle={handleToggle}
                  onSave={handleSave}
                  pillarLevelSnapshot={challenge.pillar_level_snapshot ?? undefined}
                  destinationGoalsByPillar={destinationGoalsByPillar}
                  challengeId={challenge.id}
                  startDate={challenge.start_date}
                  endDate={challenge.end_date}
                  date={today}
                  dayNumber={dayNumber}
                  durationDays={durationDays}
                  level={challenge.level}
                  onPillarSaved={handlePillarSaved}
                />
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
            lastPulseState={null}
          />
        )}

        {/* ── GOALS TAB ── */}
        {activeTab === 'goals' && (
          <ChallengeGoalsTab
            challenge={challenge}
            pillars={pillars}
            pillarGoals={pillarGoals}
            durationGoalsByPillar={destinationGoalsByPillar}
            pillarLevelsByPillar={pillarLevelsByPillar}
            onSaved={() => router.refresh()}
            videoG6bTriggered={profile.video_g6b_triggered}
          />
        )}

      </div>

      {newRewards.length > 0 && (
        <RewardUnlock rewards={newRewards} onDismiss={() => setNewRewards([])} />
      )}

      {showComplete && (
        <SoloingCompletionScreen
          daysCompleted={challenge.days_completed}
          durationDays={durationDays}
          consistencyPct={Math.round(challenge.consistency_pct)}
          pillars={pillars}
          streak={streak}
          orchestratingEligible={orchestratingEligible}
          advancingPillars={advancingPillars}
          allPillarLevelsAtFour={allPillarLevelsAtFour}
          destinationGoals={destinationGoals}
          pillarDayData={pillarDayData}
          startDate={challenge.start_date}
          challengeId={challenge.id}
        />
      )}

      <BottomNav activeTab={bottomTab} onTab={handleBottomTab} />
    </div>
  )
}
