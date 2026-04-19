import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { GroupInvitation, ConsistencyGroup } from '@/lib/types'

export interface RequestItem {
  invitation:    GroupInvitation
  group_name:    string
  from_username: string
}

// ---------------------------------------------------------------------------
// GET /api/groups/requests
// Returns pending join requests addressed to the current user as owner
// (type = 'request', to_user_id = userId, status = 'pending', not expired).
// Groups results by group so the owner can see all pending requests across
// all their groups.
// ---------------------------------------------------------------------------
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()
  const now = new Date().toISOString()

  const { data: requests, error } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('to_user_id', userId)
    .eq('type', 'request')
    .eq('status', 'pending')
    .gt('expires_at', now)
    .order('created_at', { ascending: true })
    .returns<GroupInvitation[]>()

  if (error) {
    console.error('groups/requests: failed to fetch requests:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!requests || requests.length === 0) {
    return NextResponse.json({ requests: [] })
  }

  // Fetch group names and requester usernames in parallel
  const groupIds       = [...new Set(requests.map((r) => r.group_id))]
  const requesterIds   = [...new Set(requests.map((r) => r.from_user_id))]

  const [groupsResult, profilesResult] = await Promise.all([
    supabase
      .from('consistency_groups')
      .select('id, name')
      .in('id', groupIds)
      .returns<Pick<ConsistencyGroup, 'id' | 'name'>[]>(),

    supabase
      .from('user_profile')
      .select('user_id, username')
      .in('user_id', requesterIds)
      .returns<{ user_id: string; username: string | null }[]>(),
  ])

  const groupNameMap = new Map(
    (groupsResult.data ?? []).map((g) => [g.id, g.name])
  )
  const usernameMap = new Map(
    (profilesResult.data ?? []).map((p) => [p.user_id, p.username ?? 'unknown'])
  )

  const items: RequestItem[] = requests.map((req) => ({
    invitation:    req,
    group_name:    groupNameMap.get(req.group_id) ?? 'Unknown group',
    from_username: usernameMap.get(req.from_user_id) ?? 'unknown',
  }))

  return NextResponse.json({ requests: items })
}
