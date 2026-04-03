import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { PillarLevel } from '@/lib/types'
import PillarPortrait from '@/components/consistency-profile/PillarPortrait'

export default async function PillarPortraitPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const sb = createServerSupabaseClient()

  const { data: session } = await sb
    .from('consistency_profile_sessions')
    .select('id')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!session) redirect('/consistency-profile')

  const { data: pillarLevels } = await sb
    .from('pillar_levels')
    .select('*')
    .eq('user_id', userId)

  if (!pillarLevels || pillarLevels.length === 0) redirect('/consistency-profile')

  return <PillarPortrait pillarLevels={pillarLevels as PillarLevel[]} userId={userId} />
}
