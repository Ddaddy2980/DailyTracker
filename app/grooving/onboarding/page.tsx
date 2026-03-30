import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getUserProfile, getActiveChallenge, getLastCompletedChallenge, getWatchedVideoIds } from '@/app/actions'
import GroovingOnboardingFlow from './GroovingOnboardingFlow'

export default async function GroovingOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ duration?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [profile, activeChallenge] = await Promise.all([
    getUserProfile(),
    getActiveChallenge(),
  ])

  if (!profile || !profile.onboarding_completed) redirect('/onboarding')

  // If they already have an active Level 3 challenge, skip onboarding
  if (activeChallenge?.level === 3) redirect('/grooving')

  // Must be Level 3 to be here (promoted from Jamming)
  if (profile.current_level < 3) redirect('/jamming')

  // Carry forward goals from the last completed challenge; fetch watched videos in parallel
  const [lastChallenge, watchedVideoIds] = await Promise.all([
    getLastCompletedChallenge(),
    getWatchedVideoIds(),
  ])
  const existingPillars: string[] = lastChallenge
    ? Object.keys(lastChallenge.pillar_goals as Record<string, unknown>)
    : profile.selected_pillars

  const existingGoals: Record<string, string> = lastChallenge
    ? Object.fromEntries(
        Object.entries(lastChallenge.pillar_goals as Record<string, unknown>).map(([k, v]) => [k, String(v)])
      )
    : {}

  // Duration from query param (set by JammingComplete); default 30
  const { duration } = await searchParams
  const rawDuration = Number(duration ?? '30')
  const durationDays: 30 | 50 | 66 = rawDuration === 50 ? 50 : rawDuration === 66 ? 66 : 30

  return (
    <GroovingOnboardingFlow
      durationDays={durationDays}
      existingPillars={existingPillars}
      existingGoals={existingGoals}
      watchedVideoIds={watchedVideoIds}
    />
  )
}
