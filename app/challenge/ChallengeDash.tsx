'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitCheckin } from '@/app/actions'
import type { Challenge, UserProfile, DayStatus } from '@/lib/types'
import StreakHeader  from '@/components/challenge/StreakHeader'
import ChallengeMap from '@/components/challenge/ChallengeMap'
import DayCheckIn   from '@/components/challenge/DayCheckIn'

interface Props {
  challenge:         Challenge
  profile:           UserProfile
  dayStatuses:       Record<string, DayStatus>
  todayCompletions:  Record<string, boolean>
  streak:            number
  dayNumber:         number
  today:             string
}

export default function ChallengeDash({
  challenge, profile, dayStatuses, todayCompletions, streak, dayNumber, today,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [completions, setCompletions] = useState<Record<string, boolean>>(todayCompletions)

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
      await submitCheckin({
        date:        today,
        challengeId: challenge.id,
        startDate:   challenge.start_date,
        endDate:     challenge.end_date,
        completions,
      })
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

      </div>
    </div>
  )
}
