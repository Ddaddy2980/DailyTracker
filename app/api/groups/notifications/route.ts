import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { GroupInvitation, ConsistencyGroup } from '@/lib/types'

export interface NotificationItem {
  invitation:    GroupInvitation
  group_name:    string
  from_username?: string  // populated for type='request' — the username of the requester
}

// ---------------------------------------------------------------------------
// GET /api/groups/notifications
// Returns pending invitations addressed to the current user
// (type = 'invitation', to_user_id = userId, status = 'pending', not expired).
// Used to show GroupNotificationsCard in GroupView.
// ---------------------------------------------------------------------------
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()
  const now = new Date().toISOString()

  const { data: invitations, error } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('to_user_id', userId)
    .eq('type', 'invitation')
    .eq('status', 'pending')
    .gt('expires_at', now)
    .order('created_at', { ascending: true })
    .returns<GroupInvitation[]>()

  if (error) {
    console.error('groups/notifications: failed to fetch invitations:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!invitations || invitations.length === 0) {
    return NextResponse.json({ notifications: [] })
  }

  // Fetch group names
  const groupIds = [...new Set(invitations.map((i) => i.group_id))]
  const { data: groups } = await supabase
    .from('consistency_groups')
    .select('id, name')
    .in('id', groupIds)
    .returns<Pick<ConsistencyGroup, 'id' | 'name'>[]>()

  const groupNameMap = new Map((groups ?? []).map((g) => [g.id, g.name]))

  const notifications: NotificationItem[] = invitations.map((inv) => ({
    invitation: inv,
    group_name: groupNameMap.get(inv.group_id) ?? 'Unknown group',
  }))

  return NextResponse.json({ notifications })
}
