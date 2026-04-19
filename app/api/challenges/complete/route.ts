import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'

// POST /api/challenges/complete
// Marks the user's active challenge as completed.
// Idempotent — safe to call on an already-completed challenge.
export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()

  // Resolve active challenge ID from user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profile')
    .select('active_challenge_id')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'active_challenge_id'>>()

  if (profileError || !profile?.active_challenge_id) {
    return NextResponse.json({ error: 'No active challenge found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('challenges')
    .update({
      status:       'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', profile.active_challenge_id)
    .eq('user_id', userId)

  if (error) {
    console.error('complete route: failed to mark challenge complete:', error)
    return NextResponse.json({ error: 'Failed to complete challenge' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
