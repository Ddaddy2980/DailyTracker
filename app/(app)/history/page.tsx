import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getWeekStart, todayStr } from '@/lib/constants'
import type { UserProfile, Challenge, PillarLevel, DurationGoal, PillarDailyEntry } from '@/lib/types'
import HistoryTabs from '@/components/history/HistoryTabs'

export const dynamic = 'force-dynamic'

interface HistoryPageProps {
  searchParams: { week?: string }
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServerSupabaseClient()

  const { data: profile, error: profileError } = await supabase
    .from('user_profile')
    .select('*')
    .eq('user_id', userId)
    .single<UserProfile>()

  if (profileError || !profile?.onboarding_completed || !profile?.active_challenge_id) {
    redirect('/onboarding')
  }

  const [challengeResult, pillarLevelsResult, durationGoalsResult] = await Promise.all([
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
  ])

  if (challengeResult.error || !challengeResult.data) redirect('/onboarding')

  const challenge = challengeResult.data
  const activePillarLevels = (pillarLevelsResult.data ?? []).filter((p) => p.is_active)
  const activeGoals = durationGoalsResult.data ?? []

  // Fetch all entries for this challenge (full history)
  const { data: allEntries } = await supabase
    .from('pillar_daily_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_id', challenge.id)
    .gte('entry_date', challenge.start_date)
    .lte('entry_date', todayStr())
    .returns<PillarDailyEntry[]>()

  // Resolve weekStart from search param — must be a valid Sunday on or after challenge start
  const today = todayStr()
  const rawWeek = searchParams.week
  const currentWeekStart = getWeekStart(today)
  let weekStart = currentWeekStart
  if (rawWeek && ISO_DATE_RE.test(rawWeek)) {
    // Clamp to [getWeekStart(challengeStart), currentWeek]
    const challengeWeekStart = getWeekStart(challenge.start_date)
    if (rawWeek >= challengeWeekStart && rawWeek <= currentWeekStart) {
      weekStart = rawWeek
    }
  }

  return (
    <div className="min-h-screen bg-[#EBEBEC]">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-lg font-semibold text-slate-700 mb-4">History</h1>
        <HistoryTabs
          weekStart={weekStart}
          challengeStartDate={challenge.start_date}
          allEntries={allEntries ?? []}
          activePillarLevels={activePillarLevels}
          activeGoals={activeGoals}
        />
      </div>
    </div>
  )
}
