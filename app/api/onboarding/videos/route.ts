import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// POST — mark all clarity videos as seen (advances onboarding gate)
export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('user_profile')
    .update({ clarity_videos_seen: true })
    .eq('user_id', userId)

  if (error) {
    console.error('Videos update failed:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// PUT — mark a single video watched (upsert into video_progress)
export async function PUT(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { videoId?: unknown }
  try {
    body = (await request.json()) as { videoId?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { videoId } = body
  if (typeof videoId !== 'string' || videoId.trim() === '') {
    return NextResponse.json({ error: 'Invalid videoId' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('video_progress')
    .upsert(
      { user_id: userId, video_id: videoId, watched_at: new Date().toISOString() },
      { onConflict: 'user_id,video_id' }
    )

  if (error) {
    console.error('video_progress upsert failed:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
