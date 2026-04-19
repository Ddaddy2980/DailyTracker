import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserProfile, VideoProgress } from '@/lib/types'
import ClarityVideosScreen from '@/components/onboarding/ClarityVideosScreen'
import { CLARITY_VIDEOS } from '@/lib/constants'

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

  // Fetch which clarity videos have already been watched (for revisit state restore)
  const clarityVideoIds = CLARITY_VIDEOS.map((v) => v.id)
  const { data: watchedRows } = await supabase
    .from('video_progress')
    .select('video_id')
    .eq('user_id', userId)
    .in('video_id', clarityVideoIds)
    .returns<Pick<VideoProgress, 'video_id'>[]>()

  const initialWatchedIds = (watchedRows ?? []).map((r) => r.video_id)

  return <ClarityVideosScreen initialWatchedIds={initialWatchedIds} />
}
