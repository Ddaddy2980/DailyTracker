import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'
import ClarityVideosScreen from '@/components/onboarding/ClarityVideosScreen'

export default async function VideosPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('user_profile')
    .select('clarity_videos_seen')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'clarity_videos_seen'>>()

  if (profile?.clarity_videos_seen) {
    redirect('/onboarding/profile')
  }

  return <ClarityVideosScreen />
}
