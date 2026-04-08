import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserProfile, getActiveChallenge, getPillarLevels, getLatestFocusPillar } from '@/app/actions'
import { resolvePillarStates, getChallengeDuration } from '@/lib/pillar-state'
import OnboardingFlow from './OnboardingFlow'

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [profile, challenge] = await Promise.all([getUserProfile(), getActiveChallenge()])

  // Must complete Consistency Profile before onboarding
  if (!profile?.consistency_profile_completed) redirect('/consistency-profile')

  if (profile?.onboarding_completed) {
    redirect(challenge?.is_continuous ? '/journey' : '/dashboard')
  }

  // Determine duration options and focus pillar from the completed Consistency Profile
  const [pillarLevels, focusPillar] = await Promise.all([
    getPillarLevels(),
    getLatestFocusPillar(),
  ])

  const pillarStates = resolvePillarStates(pillarLevels)
  const { options: durationOptions } = getChallengeDuration(pillarStates, pillarLevels)

  return (
    <OnboardingFlow
      durationOptions={durationOptions}
      focusPillar={focusPillar}
    />
  )
}
