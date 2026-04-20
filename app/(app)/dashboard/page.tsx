import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getDayNumber, todayStr, getEffectiveChallengeDay } from '@/lib/constants'
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
      .select('id, user_id, duration_days, start_date, status, pulse_state, is_paused, paused_at, pause_reason, pause_days_used, scheduled_pause_date, scheduled_pause_reason')
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

  // Auto-activate a scheduled pause if the date has arrived
  if (
    !challenge.is_paused &&
    challenge.scheduled_pause_date &&
    challenge.scheduled_pause_date <= todayStr()
  ) {
    const supabaseForPause = createServerSupabaseClient()
    const { error: pauseActivateError } = await supabaseForPause
      .from('challenges')
      .update({
        is_paused:             true,
        paused_at:             new Date().toISOString(),
        pause_reason:          challenge.scheduled_pause_reason,
        scheduled_pause_date:  null,
        scheduled_pause_reason: null,
      })
      .eq('id', challenge.id)
    if (pauseActivateError) {
      console.error('DashboardPage: failed to auto-activate scheduled pause:', pauseActivateError)
    } else {
      // Re-read challenge with updated pause state before continuing
      const { data: refreshed } = await supabaseForPause
        .from('challenges')
        .select('id, user_id, duration_days, start_date, status, pulse_state, is_paused, paused_at, pause_reason, pause_days_used, scheduled_pause_date, scheduled_pause_reason')
        .eq('id', challenge.id)
        .single<Challenge>()
      if (refreshed) {
        Object.assign(challenge, refreshed)
      }
    }
  }

  // If challenge is already marked completed, redirect immediately
  if (challenge.status === 'completed') redirect('/completion')

  // Compute effective day (pause-adjusted) and check for natural completion
  const effectiveDay = getEffectiveChallengeDay(challenge)
  if (effectiveDay > challenge.duration_days && !challenge.is_paused) {
    // Mark challenge complete server-side (idempotent POST)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/challenges/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      })
    } catch {
      // Non-fatal — page will redirect regardless
    }
    // Direct DB write as fallback (more reliable in server component)
    const supabaseComplete = createServerSupabaseClient()
    await supabaseComplete
      .from('challenges')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', challenge.id)
      .eq('status', 'active')
    redirect('/completion')
  }

  const daysRemaining = challenge.duration_days - effectiveDay

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
      effectiveDay={effectiveDay}
      daysRemaining={daysRemaining}
      viewingDate={viewingDate}
      userId={userId}
      isPaused={challenge.is_paused}
      pulseState={challenge.pulse_state}
      username={profile.username ?? null}
    />
  )
}
