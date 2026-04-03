import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import { resolvePillarStates } from '@/lib/pillar-state'
import type { PillarLevel, PillarName, OperatingState } from '@/lib/types'
import { FivePillarDashboard } from '@/components/profile'

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const sb = createServerSupabaseClient()

  const { data: pillarLevelRows } = await sb
    .from('pillar_levels')
    .select('*')
    .eq('user_id', userId)

  if (!pillarLevelRows || pillarLevelRows.length === 0) redirect('/consistency-profile')

  const { data: profile } = await sb
    .from('user_profile')
    .select('life_on_purpose_score')
    .eq('user_id', userId)
    .maybeSingle()

  const pillarLevels = pillarLevelRows as PillarLevel[]
  const pillarStates = resolvePillarStates(pillarLevels) as Record<PillarName, OperatingState>

  return (
    <FivePillarDashboard
      pillarLevels={pillarLevels}
      pillarStates={pillarStates}
      lifeOnPurposeScore={profile?.life_on_purpose_score ?? null}
    />
  )
}
