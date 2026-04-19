import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { todayStr } from '@/lib/constants'
import type { Challenge } from '@/lib/types'

export async function POST(_request: NextRequest) {
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

  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', profile.active_challenge_id)
    .eq('user_id', userId)
    .single<Challenge>()

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  }

  if (!challenge.is_paused) {
    return NextResponse.json({ error: 'Challenge is not currently paused' }, { status: 409 })
  }

  // Compute how many calendar days this pause lasted
  const pauseStart = challenge.paused_at
    ? new Date(challenge.paused_at)
    : new Date(todayStr() + 'T00:00:00')

  const resumeDate = new Date(todayStr() + 'T00:00:00')
  const pausedDays = Math.max(
    0,
    Math.floor((resumeDate.getTime() - pauseStart.getTime()) / 86400000)
  )
  const newPauseDaysUsed = challenge.pause_days_used + pausedDays

  const { error: updateError } = await supabase
    .from('challenges')
    .update({
      is_paused:       false,
      paused_at:       null,
      pause_reason:    null,
      pause_days_used: newPauseDaysUsed,
    })
    .eq('id', challenge.id)
    .eq('user_id', userId)

  if (updateError) {
    console.error('resume: failed to resume challenge:', updateError)
    return NextResponse.json({ error: 'Failed to resume challenge' }, { status: 500 })
  }

  return NextResponse.json({
    success:         true,
    pausedDays,
    newPauseDaysUsed,
  })
}
