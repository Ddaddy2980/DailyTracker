import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { todayInTz } from '@/lib/constants'
import { getActiveChallenge } from '@/lib/supabaseUtils'
import { evaluatePendingDays } from '@/lib/streaks'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tz = request.cookies.get('tz')?.value
  const today = todayInTz(tz)

  const supabase = createServerSupabaseClient()

  const result = await getActiveChallenge(userId, supabase)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }
  const { challenge } = result

  if (!challenge.is_paused) {
    return NextResponse.json({ error: 'Challenge is not currently paused' }, { status: 409 })
  }

  // Fold any pending days into the streak state BEFORE the pause flips off —
  // while is_paused/paused_at still identify the pause window, so days inside
  // it classify as paused (neutral) rather than missed.
  await evaluatePendingDays(userId, tz, supabase)

  // Compute how many calendar days this pause lasted
  const pauseStart = challenge.paused_at
    ? new Date(challenge.paused_at)
    : new Date(today + 'T00:00:00')

  const resumeDate = new Date(today + 'T00:00:00')
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
