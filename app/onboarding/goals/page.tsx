import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserProfile, PillarLevel } from '@/lib/types'
import GoalsFlow from '@/components/onboarding/GoalsFlow'

export default async function GoalsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('user_profile')
    .select('goals_setup_completed, selected_duration_days')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'goals_setup_completed' | 'selected_duration_days'>>()

  if (profile?.goals_setup_completed) {
    redirect('/dashboard')
  }

  const { data: pillarLevels } = await supabase
    .from('pillar_levels')
    .select('*')
    .eq('user_id', userId)
    .returns<PillarLevel[]>()

  return (
    <GoalsFlow
      pillarLevels={pillarLevels ?? []}
      durationDays={profile?.selected_duration_days ?? 30}
    />
  )
}
