'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitCheckin } from '@/app/actions'
import type {
  Challenge, UserProfile, DayStatus, RewardType,
  PendingPulseCheck, DestinationGoal, GroupWithMembers,
  PillarLevel, DurationGoalDestination,
} from '@/lib/types'

import AppHeader  from '@/components/shared/AppHeader'
import BottomNav  from '@/components/shared/BottomNav'
import type { BottomNavTab } from '@/components/shared/BottomNav'
import GroupView          from '@/components/groups/GroupView'
import ChallengeGoalsTab  from '@/components/challenge/ChallengeGoalsTab'
import HabitCalendar      from '@/components/grooving/HabitCalendar'
import DestinationGoalLayer from '@/components/grooving/DestinationGoalLayer'
import DayCheckIn         from '@/components/challenge/DayCheckIn'
import RewardUnlock       from '@/components/challenge/RewardUnlock'
import VideoLibraryTab    from '@/components/shared/VideoLibraryTab'
import SoloingHeader      from '@/components/soloing/SoloingHeader'
import SoloingWeeklyReflectionFlow from '@/components/soloing/SoloingWeeklyReflectionFlow'

interface Props {
  challenge:               Challenge
  profile:                 UserProfile
  dayStatuses:             Record<string, DayStatus>
  pillarDayData:           Record<string, Record<string, boolean>>
  todayCompletions:        Record<string, boolean>
  streak:                  number
  dayNumber:               number
  today:                   string
  earnedRewards:           RewardType[]
  pendingPulse:            PendingPulseCheck | null
  destinationGoals:        DestinationGoal[]
  destinationGoalsByPillar: Record<string, DurationGoalDestination[]>
  groups:                  GroupWithMembers[]
  watchedVideoIds:         string[]
  patternAlertDay:         string | null
  pillarLevels:            PillarLevel[]
  lastPillarCheckAt:       string | null
}

export default function SoloingDash({
  challenge, profile, dayStatuses, pillarDayData, todayCompletions, streak, dayNumber, today,
  earnedRewards, pendingPulse, destinationGoals, destinationGoalsByPillar,
  groups, watchedVideoIds, patternAlertDay, pillarLevels, lastPillarCheckAt,
}: Props) {
  void earnedRewards   // available for future use (completion screen, badge display)
  void patternAlertDay // available for future notification banner

  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  void isPending

  const [completions, setCompletions]   = useState<Record<string, boolean>>(todayCompletions)
  const [newRewards, setNewRewards]     = useState<RewardType[]>([])
  const [showReflection, setShowReflection] = useState(
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

      if (awarded.length > 0) setNewRewards(awarded)
      setActiveTab('today')
      router.refresh()
    })
  }

  function handlePillarSaved(delta: Record<string, boolean>, newRewardsList?: RewardType[]) {
    setCompletions(prev => ({ ...prev, ...delta }))
    if (newRewardsList && newRewardsList.length > 0) setNewRewards(newRewardsList)
    router.refresh()
  }

  // ── Bottom nav mapping ─────────────────────────────────────────────────────
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
              <SoloingWeeklyReflectionFlow
                challengeId={challenge.id}
                weekNumber={pendingPulse.weekNumber}
                pillars={pillars}
                pillarDayData={pillarDayData}
                startDate={challenge.start_date}
                destinationGoals={destinationGoals}
                durationGoalDestinations={Object.values(destinationGoalsByPillar).flat()}
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

      <BottomNav activeTab={bottomTab} onTab={handleBottomTab} />
    </div>
  )
}
