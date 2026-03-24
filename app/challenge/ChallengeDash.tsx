'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitCheckin } from '@/app/actions'
import type { Challenge, UserProfile, DayStatus, RewardType } from '@/lib/types'
import StreakHeader    from '@/components/challenge/StreakHeader'
import ChallengeMap   from '@/components/challenge/ChallengeMap'
import DayCheckIn     from '@/components/challenge/DayCheckIn'
import EarnedBadges   from '@/components/challenge/EarnedBadges'
import RewardUnlock   from '@/components/challenge/RewardUnlock'
import Day7Celebration from '@/components/challenge/Day7Celebration'
import VideoSection   from '@/components/challenge/VideoSection'

interface Props {
  challenge:         Challenge
  profile:           UserProfile
  dayStatuses:       Record<string, DayStatus>
  todayCompletions:  Record<string, boolean>
  streak:            number
  dayNumber:         number
  today:             string
  earnedRewards:     RewardType[]
  watchedVideoIds:   string[]
}

export default function ChallengeDash({
  challenge, profile, dayStatuses, todayCompletions, streak, dayNumber, today,
  earnedRewards, watchedVideoIds,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [completions, setCompletions] = useState<Record<string, boolean>>(todayCompletions)

  // Reward celebration state — only set after a fresh save, cleared on dismiss
  const [newRewards, setNewRewards] = useState<RewardType[]>([])
  const [showDay7, setShowDay7]     = useState(false)

  const pillars     = profile.selected_pillars
  const pillarGoals = Object.fromEntries(
    Object.entries(challenge.pillar_goals).map(([k, v]) => [k, String(v)])
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
        date:        today,
        challengeId: challenge.id,
        startDate:   challenge.start_date,
        endDate:     challenge.end_date,
        completions,
        dayNumber,
      })

      if (awarded.includes('day7_complete') || awarded.includes('starter_badge')) {
        setShowDay7(true)
      } else if (awarded.length > 0) {
        setNewRewards(awarded)
      }

      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-lg mx-auto px-5 pt-8 pb-16 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Level 1 — Starter
          </p>
          <p className="text-xs text-slate-500">
            {challenge.days_completed}/7 days complete
          </p>
        </div>

        {/* Streak header + purpose reminder */}
        <StreakHeader
          dayNumber={dayNumber}
          streak={streak}
          purposeStatement={profile.purpose_statement}
          todayComplete={todayComplete && alreadySaved}
        />

        {/* 7-day map */}
        <ChallengeMap
          startDate={challenge.start_date}
          dayNumber={dayNumber}
          dayStatuses={dayStatuses}
        />

        {/* Milestone badges */}
        <EarnedBadges earned={earnedRewards} />

        {/* Daily check-in */}
        <DayCheckIn
          pillars={pillars}
          pillarGoals={pillarGoals}
          completions={completions}
          isPending={isPending}
          alreadySaved={alreadySaved}
          onToggle={handleToggle}
          onSave={handleSave}
        />

        {/* Video coaching */}
        <VideoSection
          dayNumber={dayNumber}
          selectedPillars={pillars}
          watchedVideoIds={watchedVideoIds}
        />

      </div>

      {/* Mid-challenge reward overlay (Days 1, 3, 4) */}
      {newRewards.length > 0 && (
        <RewardUnlock rewards={newRewards} onDismiss={() => setNewRewards([])} />
      )}

      {/* Day 7 full celebration */}
      {showDay7 && (
        <Day7Celebration
          name={null}
          daysCount={challenge.days_completed}
          onDismiss={() => setShowDay7(false)}
        />
      )}
    </div>
  )
}
