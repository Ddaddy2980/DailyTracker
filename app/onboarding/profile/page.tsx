import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'
import ProfileFlow from '@/components/onboarding/ProfileFlow'

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('user_profile')
    .select('consistency_profile_completed')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'consistency_profile_completed'>>()

  if (profile?.consistency_profile_completed) {
    redirect('/onboarding/goals')
  }

  return <ProfileFlow />
}
