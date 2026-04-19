import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'
import UsernameSetupScreen from '@/components/onboarding/UsernameSetupScreen'

export default async function UsernamePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('user_profile')
    .select('username_set')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'username_set'>>()

  // Already set — skip to next step
  if (profile?.username_set) {
    redirect('/onboarding/duration')
  }

  return <UsernameSetupScreen />
}
