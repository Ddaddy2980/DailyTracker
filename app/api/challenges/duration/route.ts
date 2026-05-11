import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getEffectiveChallengeDay, todayInTz } from '@/lib/constants'
import { getActiveChallenge } from '@/lib/supabaseUtils'

// PATCH /api/challenges/duration
// Changes the duration_days of the user's active challenge.
// Accepts any positive integer (presets OR "Add a Week" non-preset values).
// Returns { success, wouldCompleteNow } — wouldCompleteNow is true when the
// new duration would immediately end the challenge (new days < current effective day).
export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tz = req.cookies.get('tz')?.value
  const today = todayInTz(tz)

  let body: { durationDays?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { durationDays } = body
  if (typeof durationDays !== 'number' || !Number.isInteger(durationDays) || durationDays < 1) {
    return NextResponse.json({ error: 'durationDays must be a positive integer' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  const result = await getActiveChallenge(userId, supabase)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }
  const { challenge } = result

  if (challenge.status !== 'active') {
    return NextResponse.json({ error: 'Challenge is not active' }, { status: 409 })
  }

  const effectiveDay = getEffectiveChallengeDay(challenge, today)
  const wouldCompleteNow = durationDays < effectiveDay

  const { error: updateError } = await supabase
    .from('challenges')
    .update({ duration_days: durationDays })
    .eq('id', challenge.id)
    .eq('user_id', userId)

  if (updateError) {
    console.error('duration route: failed to update challenge duration:', updateError)
    return NextResponse.json({ error: 'Failed to update duration' }, { status: 500 })
  }

  return NextResponse.json({ success: true, wouldCompleteNow })
}
