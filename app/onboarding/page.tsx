import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserProfile } from '@/app/actions'
import OnboardingFlow from './OnboardingFlow'

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const profile = await getUserProfile()

  // Already completed onboarding — don't allow re-entry
  if (profile?.onboarding_completed) redirect('/dashboard')

  return <OnboardingFlow />
}
