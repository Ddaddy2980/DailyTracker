import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { CHALLENGE_DURATIONS } from '@/lib/constants'
import type { ChallengeDuration } from '@/lib/types'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('duration_days' in body)
  ) {
    return NextResponse.json({ error: 'Missing duration_days' }, { status: 400 })
  }

  const { duration_days } = body as { duration_days: unknown }

  if (
    typeof duration_days !== 'number' ||
    !(CHALLENGE_DURATIONS as readonly number[]).includes(duration_days)
  ) {
    return NextResponse.json(
      { error: 'duration_days must be one of 21, 30, 60, 90, 100' },
      { status: 400 }
    )
  }

  const validDuration = duration_days as ChallengeDuration
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('user_profile')
    .update({
      challenge_duration_selected: true,
      selected_duration_days: validDuration,
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Duration update failed:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
