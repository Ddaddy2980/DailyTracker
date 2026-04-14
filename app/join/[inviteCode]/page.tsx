import { redirect } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { todayStr } from '@/lib/constants'
import type { ConsistencyGroup, GroupMember } from '@/lib/types'

interface PageProps {
  params: Promise<{ inviteCode: string }>
}

// ---------------------------------------------------------------------------
// /join/[inviteCode]
// Deep-link invite handler. Authenticated users are joined to the group and
// redirected to /groups. Unauthenticated users are sent to sign-in first.
// ---------------------------------------------------------------------------
export default async function JoinInvitePage({ params }: PageProps) {
  const { userId } = await auth()
  const { inviteCode } = await params

  if (!userId) {
    redirect(`/sign-in?redirect_url=/join/${inviteCode}`)
  }

  const code = inviteCode.toUpperCase()
  const supabase = createServerSupabaseClient()

  // Look up group
  const { data: group, error: groupError } = await supabase
    .from('consistency_groups')
    .select('*')
    .eq('invite_code', code)
    .maybeSingle<ConsistencyGroup>()

  if (groupError || !group) {
    redirect('/groups?joinError=Invalid+invite+code')
  }

  if (group.status !== 'active') {
    redirect('/groups?joinError=This+group+is+no+longer+accepting+new+members')
  }

  // Check if already an active member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id, is_active')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .maybeSingle<Pick<GroupMember, 'id' | 'is_active'>>()

  if (existing?.is_active) {
    redirect('/groups')
  }

  // Count active members
  const { count } = await supabase
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', group.id)
    .eq('is_active', true)

  if ((count ?? 0) >= group.max_members) {
    redirect('/groups?joinError=This+group+is+full')
  }

  // Get display name from Clerk
  const clerkUser = await currentUser()
  const displayName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') ||
    'Member'

  if (existing) {
    // Re-activate previously left member
    await supabase
      .from('group_members')
      .update({ is_active: true, display_name: displayName })
      .eq('id', existing.id)
  } else {
    await supabase.from('group_members').insert({
      group_id:     group.id,
      user_id:      userId,
      display_name: displayName,
      is_active:    true,
    })
  }

  // If user has already completed a pillar today, mark them green immediately
  const { data: todayEntry } = await supabase
    .from('pillar_daily_entries')
    .select('id')
    .eq('user_id', userId)
    .eq('entry_date', todayStr())
    .eq('completed', true)
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (todayEntry) {
    await supabase.from('group_daily_status').upsert(
      {
        group_id:    group.id,
        user_id:     userId,
        status_date: todayStr(),
        completed:   true,
      },
      { onConflict: 'group_id,user_id,status_date' }
    )
  }

  redirect('/groups')
}
