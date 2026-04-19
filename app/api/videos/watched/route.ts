import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// PUT — mark a coaching video as watched
// body: { videoId: string }
// Upserts a row in video_progress. Safe to call multiple times (idempotent).
export async function PUT(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: unknown = await request.json()
  if (
    typeof body !== 'object' ||
    body === null ||
    !('videoId' in body) ||
    typeof (body as Record<string, unknown>).videoId !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing videoId' }, { status: 400 })
  }

  const { videoId } = body as { videoId: string }

  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('video_progress')
    .upsert(
      { user_id: userId, video_id: videoId },
      { onConflict: 'user_id,video_id' }
    )

  if (error) {
    console.error('video watched upsert failed:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
