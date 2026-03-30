import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserProfile, getLastCompletedChallenge } from '@/app/actions'
import JammingOnboardingFlow from './JammingOnboardingFlow'

interface Props {
  searchParams: { duration?: string }
}

export default async function JammingOnboardingPage({ searchParams }: Props) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const raw = parseInt(searchParams.duration ?? '21')
  const durationDays: 14 | 21 = raw === 14 ? 14 : 21

  const [profile, lastChallenge] = await Promise.all([
    getUserProfile(),
    getLastCompletedChallenge(),
  ])

  if (!profile) redirect('/sign-in')

  // If they already have an active Level 2 challenge, skip onboarding
  if (profile.current_level >= 2 && !lastChallenge) redirect('/challenge')

  const existingPillars = profile.selected_pillars
  const existingGoals   = lastChallenge
    ? Object.fromEntries(
        Object.entries(lastChallenge.pillar_goals).map(([k, v]) => [k, String(v)])
      )
    : {}

  return (
    <JammingOnboardingFlow
      durationDays={durationDays}
      existingPillars={existingPillars}
      existingGoals={existingGoals}
      purposeStatement={profile.purpose_statement ?? ''}
    />
  )
}
