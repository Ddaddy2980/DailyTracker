import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { todayInTz } from '@/lib/constants'
import type { UserProfile, Challenge, PillarLevel, PillarDailyEntry, DurationGoal } from '@/lib/types'
import type { PillarName, LevelNumber } from '@/lib/types'
import CompletionScreen from '@/components/completion/CompletionScreen'
import type { PillarStat } from '@/components/completion/CompletionScreen'

export const dynamic = 'force-dynamic'

export default async function CompletionPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const tz = cookies().get('tz')?.value
  const today = todayInTz(tz)

  const supabase = createServerSupabaseClient()

  // Load user profile to get the active (completed) challenge ID
  const { data: profile, error: profileError } = await supabase
    .from('user_profile')
    .select('active_challenge_id, onboarding_completed')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'active_challenge_id' | 'onboarding_completed'>>()

  if (profileError || !profile) redirect('/onboarding')
  if (!profile.onboarding_completed) redirect('/onboarding')
  if (!profile.active_challenge_id) redirect('/onboarding')

  // Load the challenge
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', profile.active_challenge_id)
    .eq('user_id', userId)
    .single<Challenge>()

  if (challengeError || !challenge) redirect('/onboarding')

  // Guard: if challenge is still active, send back to the dashboard
  if (challenge.status !== 'completed') redirect('/dashboard')

  // Fetch pillar levels, all entries for this challenge, and active duration goals
  const [pillarLevelsResult, entriesResult, goalsResult] = await Promise.all([
    supabase
      .from('pillar_levels')
      .select('*')
      .eq('user_id', userId)
      .returns<PillarLevel[]>(),

    supabase
      .from('pillar_daily_entries')
      .select('pillar, completed')
      .eq('user_id', userId)
      .eq('challenge_id', challenge.id)
      .returns<Pick<PillarDailyEntry, 'pillar' | 'completed'>[]>(),

    supabase
      .from('duration_goals')
      .select('id, pillar')
      .eq('user_id', userId)
      .eq('is_active', true)
      .returns<Pick<DurationGoal, 'id' | 'pillar'>[]>(),
  ])

  if (pillarLevelsResult.error) {
    console.error('CompletionPage: failed to load pillar_levels:', pillarLevelsResult.error)
  }
  if (entriesResult.error) {
    console.error('CompletionPage: failed to load pillar_daily_entries:', entriesResult.error)
  }

  const pillarLevels = pillarLevelsResult.data ?? []
  const allEntries   = entriesResult.data ?? []
  const durationDays = challenge.duration_days

  // Active pillars only — in canonical display order
  const PILLAR_ORDER: PillarName[] = ['spiritual', 'physical', 'nutritional', 'personal', 'relational']
  const activeLevels = PILLAR_ORDER
    .map((p) => pillarLevels.find((pl) => pl.pillar === p))
    .filter((pl): pl is PillarLevel => pl !== undefined && pl.is_active)

  // Per-pillar completion %
  // Numerator:   entries where completed = true for this pillar
  // Denominator: challenge duration_days (the full challenge length)
  const pillarStats: PillarStat[] = activeLevels.map((pl) => {
    const completedEntries = allEntries.filter(
      (e) => e.pillar === pl.pillar && e.completed
    ).length
    const completionPct = Math.round((completedEntries / durationDays) * 100)
    return {
      pillar:        pl.pillar as PillarName,
      level:         pl.level as LevelNumber,
      completionPct: Math.min(completionPct, 100),
    }
  })

  // Overall consistency %
  // Numerator:   all completed entries across every active pillar
  // Denominator: active pillars × duration_days  (every possible check-in slot)
  const totalCompleted = pillarStats.reduce((sum, s) => {
    return sum + allEntries.filter((e) => e.pillar === s.pillar && e.completed).length
  }, 0)
  const maxPossible = activeLevels.length * durationDays
  const overallPct = maxPossible === 0
    ? 0
    : Math.min(100, Math.round((totalCompleted / maxPossible) * 100))

  // Derive display date for completion — use completed_at if available, else today
  const completedAt = challenge.completed_at
    ? challenge.completed_at.slice(0, 10)
    : today

  return (
    <CompletionScreen
      challengeDurationDays={durationDays}
      startDate={challenge.start_date}
      completedAt={completedAt}
      overallPct={overallPct}
      pillarStats={pillarStats}
    />
  )
}
