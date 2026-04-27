import { redirect } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getEffectiveChallengeDay } from '@/lib/constants'
import type { UserProfile, Challenge } from '@/lib/types'
import AccountSection from '@/components/settings/AccountSection'
import ChallengeSection from '@/components/settings/ChallengeSection'
import ProfileSection from '@/components/settings/ProfileSection'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [clerkUser, supabase] = await Promise.all([
    currentUser(),
    Promise.resolve(createServerSupabaseClient()),
  ])

  const { data: profile } = await supabase
    .from('user_profile')
    .select('onboarding_completed, active_challenge_id, username')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'onboarding_completed' | 'active_challenge_id' | 'username'>>()

  if (!profile?.onboarding_completed) redirect('/onboarding')

  const { data: challenge } = profile.active_challenge_id
    ? await supabase
        .from('challenges')
        .select('id, duration_days, start_date, is_paused, paused_at, pause_days_used')
        .eq('id', profile.active_challenge_id)
        .eq('user_id', userId)
        .single<Pick<Challenge, 'id' | 'duration_days' | 'start_date' | 'is_paused' | 'paused_at' | 'pause_days_used'>>()
    : { data: null }

  const username = profile?.username ?? ''
  const email    = clerkUser?.emailAddresses?.[0]?.emailAddress ?? ''

  const effectiveDay = challenge
    ? getEffectiveChallengeDay(challenge)
    : 1

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-slate-800 mb-5">Settings</h1>

      <AccountSection username={username} email={email} />

      {challenge && (
        <ChallengeSection
          currentDuration={challenge.duration_days}
          currentDay={effectiveDay}
          isPaused={challenge.is_paused ?? false}
        />
      )}

      <ProfileSection />
    </div>
  )
}
