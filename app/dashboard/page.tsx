import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getDayNumber, todayStr } from '@/lib/constants'
import type { UserProfile, Challenge, PillarLevel, DurationGoal, PillarDailyEntry } from '@/lib/types'
import DashboardShell from '@/components/dashboard/DashboardShell'

// Always fetch fresh data — never serve a cached page
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServerSupabaseClient()

  // Fetch user_profile first — need it to gate the rest
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single<UserProfile>()

  if (profileError) {
    console.error('DashboardPage: failed to load user_profile:', profileError)
    redirect('/onboarding')
  }

  if (!profile?.onboarding_completed) redirect('/onboarding')
  if (!profile?.active_challenge_id) redirect('/onboarding')

  // Fetch remaining data in parallel
  const [
    challengeResult,
    pillarLevelsResult,
    durationGoalsResult,
    todayEntriesResult,
  ] = await Promise.all([
    supabase
      .from('challenges')
      .select('*')
      .eq('id', profile.active_challenge_id)
      .single<Challenge>(),

    supabase
      .from('pillar_levels')
      .select('*')
      .eq('user_id', userId)
      .returns<PillarLevel[]>(),

    supabase
      .from('duration_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .returns<DurationGoal[]>(),

    supabase
      .from('pillar_daily_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('entry_date', todayStr())
      .returns<PillarDailyEntry[]>(),
  ])

  if (challengeResult.error) {
    console.error('DashboardPage: failed to load challenge:', challengeResult.error)
    redirect('/onboarding')
  }

  const challenge = challengeResult.data
  if (!challenge) redirect('/onboarding')

  const pillarLevels = pillarLevelsResult.data ?? []
  const durationGoals = durationGoalsResult.data ?? []
  const todayEntries = todayEntriesResult.data ?? []

  if (pillarLevelsResult.error) {
    console.error('DashboardPage: failed to load pillar_levels:', pillarLevelsResult.error)
  }
  if (durationGoalsResult.error) {
    console.error('DashboardPage: failed to load duration_goals:', durationGoalsResult.error)
  }
  if (todayEntriesResult.error) {
    console.error('DashboardPage: failed to load pillar_daily_entries:', todayEntriesResult.error)
  }

  const currentDay = getDayNumber(challenge.start_date)

  return (
    <DashboardShell
      challenge={challenge}
      pillarLevels={pillarLevels}
      durationGoals={durationGoals}
      todayEntries={todayEntries}
      currentDay={currentDay}
      userId={userId}
    />
  )
}
