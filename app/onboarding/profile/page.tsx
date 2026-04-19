import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'
import ProfileFlow from '@/components/onboarding/ProfileFlow'

interface ProfilePageProps {
  searchParams: { retake?: string }
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const isRetake = searchParams.retake === '1'

  const supabase = createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('user_profile')
    .select('consistency_profile_completed')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'consistency_profile_completed'>>()

  // Skip the completed-gate redirect when retaking
  if (!isRetake && profile?.consistency_profile_completed) {
    redirect('/onboarding/goals')
  }

  return <ProfileFlow isRetake={isRetake} />
}
