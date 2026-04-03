import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserProfile, getActiveChallenge } from '@/app/actions'
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

  return <OnboardingFlow />
}
