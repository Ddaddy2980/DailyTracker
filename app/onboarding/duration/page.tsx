import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'
import DurationPicker from '@/components/onboarding/DurationPicker'

export default async function DurationPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('user_profile')
    .select('challenge_duration_selected')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'challenge_duration_selected'>>()

  if (profile?.challenge_duration_selected) {
    redirect('/onboarding/videos')
  }

  return <DurationPicker />
}
