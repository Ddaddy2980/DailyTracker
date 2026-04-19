import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserProfile, Challenge } from '@/lib/types'

// POST /api/challenges/restart
// Creates a new challenge row, updates user_profile.active_challenge_id.
// If retakeProfile=true: resets consistency_profile_completed so the gate reopens.
// Pillar levels carry forward unchanged in all cases.
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { retakeProfile?: boolean; durationDays?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { retakeProfile = false, durationDays } = body

  if (!durationDays || typeof durationDays !== 'number' || durationDays < 1) {
    return NextResponse.json({ error: 'durationDays must be a positive integer' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  // Fetch the current active challenge for start_date context
  const { data: profile, error: profileError } = await supabase
    .from('user_profile')
    .select('active_challenge_id')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'active_challenge_id'>>()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // todayStr in YYYY-MM-DD format
  const today = new Intl.DateTimeFormat('en-CA').format(new Date())

  // Create a new challenge row
  const { data: newChallenge, error: challengeError } = await supabase
    .from('challenges')
    .insert({
      user_id:         userId,
      duration_days:   durationDays,
      start_date:      today,
      status:          'active',
      pause_days_used: 0,
      pulse_state:     'smooth_sailing',
    })
    .select('id')
    .single<Pick<Challenge, 'id'>>()

  if (challengeError || !newChallenge) {
    console.error('restart route: failed to create new challenge:', challengeError)
    return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
  }

  // Update user_profile: point to the new challenge
  const profileUpdate: Record<string, unknown> = {
    active_challenge_id: newChallenge.id,
  }
  if (retakeProfile) {
    // Reset gate so /onboarding/profile opens; goals_setup_completed and
    // onboarding_completed remain true — user doesn't re-do the full flow
    profileUpdate.consistency_profile_completed = false
  }

  const { error: updateError } = await supabase
    .from('user_profile')
    .update(profileUpdate)
    .eq('user_id', userId)

  if (updateError) {
    console.error('restart route: failed to update user_profile:', updateError)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  // Return the redirect target
  const redirectTo = retakeProfile ? '/onboarding/profile?retake=1' : '/dashboard'
  return NextResponse.json({ success: true, redirectTo })
}
