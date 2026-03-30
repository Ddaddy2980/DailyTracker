import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserProfile, getActiveChallenge } from '@/app/actions'
import OnboardingFlow from './OnboardingFlow'

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [profile, challenge] = await Promise.all([getUserProfile(), getActiveChallenge()])

  if (profile?.onboarding_completed) {
    redirect(challenge?.is_continuous ? '/journey' : '/dashboard')
  }

  return <OnboardingFlow />
}
