import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { VIDEO_LIBRARY_SECTIONS } from '@/lib/constants'
import type { VideoProgress } from '@/lib/types'
import VideoLibrary from '@/components/shared/VideoLibrary'

export const dynamic = 'force-dynamic'

export default async function VideosPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServerSupabaseClient()

  const allVideoIds = VIDEO_LIBRARY_SECTIONS.flatMap((s) => s.videoIds)

  const { data: progressRows } = await supabase
    .from('video_progress')
    .select('video_id')
    .eq('user_id', userId)
    .in('video_id', allVideoIds)
    .returns<Pick<VideoProgress, 'video_id'>[]>()

  const watchedIds = (progressRows ?? []).map((r) => r.video_id)

  return (
    <div className="min-h-screen bg-[#EBEBEC]">
      <div className="px-4 py-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Video Library</h1>
        <p className="text-sm text-slate-500 mb-6">
          Your full coaching library — from onboarding through every level.
        </p>
        <VideoLibrary initialWatchedIds={watchedIds} />
      </div>
    </div>
  )
}
