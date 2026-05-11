// =============================================================================
// lib/supabaseUtils.ts
// Shared Supabase helpers for API routes.
// =============================================================================

import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserProfile, Challenge } from '@/lib/types'

type Supabase = ReturnType<typeof createServerSupabaseClient>

type ActiveChallengeResult =
  | { ok: true;  challenge: Challenge }
  | { ok: false; error: string }

// Resolves the user's active challenge with ownership verification.
// Caller passes a Supabase client (server-side, service-role).
// Returns either the full Challenge row or an error string suitable for
// 404 responses ("No active challenge found" or "Challenge not found").
export async function getActiveChallenge(
  userId: string,
  supabase: Supabase,
): Promise<ActiveChallengeResult> {
  const { data: profile } = await supabase
    .from('user_profile')
    .select('active_challenge_id')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'active_challenge_id'>>()

  if (!profile?.active_challenge_id) {
    return { ok: false, error: 'No active challenge found' }
  }

  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', profile.active_challenge_id)
    .eq('user_id', userId)
    .single<Challenge>()

  if (challengeError || !challenge) {
    return { ok: false, error: 'Challenge not found' }
  }

  return { ok: true, challenge }
}
