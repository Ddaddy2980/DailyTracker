import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { todayStr } from '@/lib/constants'
import type { Challenge } from '@/lib/types'

// Maximum calendar days a challenge may be paused in total
const MAX_PAUSE_DAYS = 14

interface PauseRequestBody {
  type:           unknown   // 'immediate' | 'scheduled'
  reason?:        unknown   // optional free-text
  scheduledDate?: unknown   // YYYY-MM-DD (required when type === 'scheduled')
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: PauseRequestBody
  try {
    body = (await request.json()) as PauseRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, reason, scheduledDate } = body

  if (type !== 'immediate' && type !== 'scheduled') {
    return NextResponse.json({ error: 'type must be "immediate" or "scheduled"' }, { status: 400 })
  }

  if (type === 'scheduled') {
    if (typeof scheduledDate !== 'string' || !ISO_DATE_RE.test(scheduledDate)) {
      return NextResponse.json({ error: 'scheduledDate must be a valid YYYY-MM-DD date' }, { status: 400 })
    }
    if (scheduledDate <= todayStr()) {
      return NextResponse.json({ error: 'scheduledDate must be a future date' }, { status: 400 })
    }
  }

  const safeReason = typeof reason === 'string' ? reason.trim().slice(0, 500) || null : null

  const supabase = createServerSupabaseClient()

  // Fetch the active challenge
  const { data: profile } = await supabase
    .from('user_profile')
    .select('active_challenge_id')
    .eq('user_id', userId)
    .single<{ active_challenge_id: string | null }>()

  if (!profile?.active_challenge_id) {
    return NextResponse.json({ error: 'No active challenge found' }, { status: 404 })
  }

  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', profile.active_challenge_id)
    .eq('user_id', userId)
    .single<Challenge>()

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  }

  if (type === 'immediate') {
    if (challenge.is_paused) {
      return NextResponse.json({ error: 'Challenge is already paused' }, { status: 409 })
    }

    if (challenge.pause_days_used >= MAX_PAUSE_DAYS) {
      return NextResponse.json(
        { error: `Maximum pause limit of ${MAX_PAUSE_DAYS} days already reached` },
        { status: 422 }
      )
    }

    const { error: updateError } = await supabase
      .from('challenges')
      .update({
        is_paused:    true,
        paused_at:    new Date().toISOString(),
        pause_reason: safeReason,
        // Clear any scheduled pause since user is doing it immediately
        scheduled_pause_date:   null,
        scheduled_pause_reason: null,
      })
      .eq('id', challenge.id)
      .eq('user_id', userId)

    if (updateError) {
      console.error('pause: failed to pause challenge:', updateError)
      return NextResponse.json({ error: 'Failed to pause challenge' }, { status: 500 })
    }

    return NextResponse.json({ success: true, type: 'immediate' })
  }

  // type === 'scheduled'
  const { error: updateError } = await supabase
    .from('challenges')
    .update({
      scheduled_pause_date:   scheduledDate as string,
      scheduled_pause_reason: safeReason,
    })
    .eq('id', challenge.id)
    .eq('user_id', userId)

  if (updateError) {
    console.error('pause: failed to schedule pause:', updateError)
    return NextResponse.json({ error: 'Failed to schedule pause' }, { status: 500 })
  }

  return NextResponse.json({ success: true, type: 'scheduled', scheduledDate })
}

// DELETE — cancel a scheduled pause
export async function DELETE(_request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('user_profile')
    .select('active_challenge_id')
    .eq('user_id', userId)
    .single<{ active_challenge_id: string | null }>()

  if (!profile?.active_challenge_id) {
    return NextResponse.json({ error: 'No active challenge found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('challenges')
    .update({ scheduled_pause_date: null, scheduled_pause_reason: null })
    .eq('id', profile.active_challenge_id)
    .eq('user_id', userId)

  if (error) {
    console.error('pause: failed to cancel scheduled pause:', error)
    return NextResponse.json({ error: 'Failed to cancel scheduled pause' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
