import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'

// ─── Onboarding router ────────────────────────────────────────────────────────
// Reads the four step-gate flags and redirects to the first incomplete step.
// Each step page also redirects forward when its gate is already true, but
// this central router means navigating to /onboarding always lands correctly.

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServerSupabaseClient()

  const { data: profile, error } = await supabase
    .from('user_profile')
    .select(
      'challenge_duration_selected, clarity_videos_seen, consistency_profile_completed, goals_setup_completed, onboarding_completed'
    )
    .eq('user_id', userId)
    .single<
      Pick<
        UserProfile,
        | 'challenge_duration_selected'
        | 'clarity_videos_seen'
        | 'consistency_profile_completed'
        | 'goals_setup_completed'
        | 'onboarding_completed'
      >
    >()

  if (error || !profile) {
    redirect('/onboarding/duration')
  }

  if (profile.onboarding_completed) {
    redirect('/dashboard')
  }

  if (!profile.challenge_duration_selected) {
    redirect('/onboarding/duration')
  }

  if (!profile.clarity_videos_seen) {
    redirect('/onboarding/videos')
  }

  if (!profile.consistency_profile_completed) {
    redirect('/onboarding/profile')
  }

  if (!profile.goals_setup_completed) {
    redirect('/onboarding/goals')
  }

  // All steps done but onboarding_completed still false — goals API sets it
  redirect('/onboarding/goals')
}
