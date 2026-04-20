import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { PILLAR_ORDER } from '@/lib/constants'
import type { UserProfile, PillarLevel, DurationGoal, DestinationGoal, LevelNumber } from '@/lib/types'
import GoalEditorCard from '@/components/goals/GoalEditorCard'

export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('user_profile')
    .select('onboarding_completed')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'onboarding_completed'>>()

  if (!profile?.onboarding_completed) redirect('/onboarding')

  const [pillarLevelsResult, durationGoalsResult, destinationGoalsResult] = await Promise.all([
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

  const pillarLevels      = pillarLevelsResult.data      ?? []
  const durationGoals     = durationGoalsResult.data     ?? []
  const destinationGoals  = destinationGoalsResult.data  ?? []

  const levelMap = Object.fromEntries(
    pillarLevels.map((pl) => [pl.pillar, pl.level as LevelNumber])
  ) as Record<string, LevelNumber>

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <p className="text-sm font-bold text-slate-800 mb-5 text-center">
        Add, edit, or remove goals for each pillar.
      </p>

      {PILLAR_ORDER.map((pillar) => {
        const level    = levelMap[pillar] ?? 1
        const goals    = durationGoals.filter((g) => g.pillar === pillar)
        const destGoals = destinationGoals.filter((g) => g.pillar === pillar)
        return (
          <GoalEditorCard
            key={pillar}
            context="mid-challenge"
            pillar={pillar}
            level={level}
            initialGoals={goals}
            initialDestinationGoals={destGoals}
          />
        )
      })}
    </div>
  )
}
