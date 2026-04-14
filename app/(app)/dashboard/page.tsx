import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getDayNumber, todayStr } from '@/lib/constants'
import type { UserProfile, Challenge, PillarLevel, DurationGoal, DestinationGoal, PillarDailyEntry } from '@/lib/types'
import DashboardShell from '@/components/dashboard/DashboardShell'

// Always fetch fresh data — never serve a cached page
export const dynamic = 'force-dynamic'

interface DashboardPageProps {
  searchParams: { date?: string }
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServerSupabaseClient()

  // Fetch user_profile first — need it to gate the rest
  const { data: profile, error: profileError } = await supabase
    .from('user_profile')
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
    destinationGoalsResult,
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
      .from('destination_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .returns<DestinationGoal[]>(),
  ])

  if (challengeResult.error) {
    console.error('DashboardPage: failed to load challenge:', challengeResult.error)
    redirect('/onboarding')
  }

  const challenge = challengeResult.data
  if (!challenge) redirect('/onboarding')

  // Resolve viewingDate from search param — must be a valid date within the challenge window
  const today = todayStr()
  const rawDate = searchParams.date
  let viewingDate = today
  if (rawDate && ISO_DATE_RE.test(rawDate) && rawDate >= challenge.start_date && rawDate <= today) {
    viewingDate = rawDate
  }

  // Fetch all entries from challenge start through viewingDate.
  // This covers rolling window dot visualizations (7/14 day windows ending at viewingDate)
  // and populates retroactive editing for any past day.
  const { data: allEntries, error: entriesError } = await supabase
    .from('pillar_daily_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_id', challenge.id)
    .gte('entry_date', challenge.start_date)
    .lte('entry_date', viewingDate)
    .returns<PillarDailyEntry[]>()

  if (entriesError) {
    console.error('DashboardPage: failed to load pillar_daily_entries:', entriesError)
  }

  const pillarLevels = pillarLevelsResult.data ?? []
  const durationGoals = durationGoalsResult.data ?? []
  const destinationGoals = destinationGoalsResult.data ?? []
  const windowEntries = allEntries ?? []

  if (pillarLevelsResult.error) {
    console.error('DashboardPage: failed to load pillar_levels:', pillarLevelsResult.error)
  }
  if (durationGoalsResult.error) {
    console.error('DashboardPage: failed to load duration_goals:', durationGoalsResult.error)
  }
  if (destinationGoalsResult.error) {
    console.error('DashboardPage: failed to load destination_goals:', destinationGoalsResult.error)
  }

  const currentDay = getDayNumber(challenge.start_date)

  return (
    <DashboardShell
      challenge={challenge}
      pillarLevels={pillarLevels}
      durationGoals={durationGoals}
      destinationGoals={destinationGoals}
      windowEntries={windowEntries}
      currentDay={currentDay}
      viewingDate={viewingDate}
      userId={userId}
    />
  )
}
