import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { todayInTz } from '@/lib/constants'
import GroupView from '@/components/groups/GroupView'
import type {
  ConsistencyGroup,
  GroupMember,
  GroupDailyStatus,
  GroupWithDetails,
  GroupInvitation,
  UserProfile,
} from '@/lib/types'
import type { NotificationItem } from '@/app/api/groups/notifications/route'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ joinError?: string }>
}

export default async function GroupsPage({ searchParams }: PageProps) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { joinError } = await searchParams
  const tz = cookies().get('tz')?.value
  const today = todayInTz(tz)
  const supabase = createServerSupabaseClient()

  // 1. Get all group_ids this user actively belongs to
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .returns<{ group_id: string }[]>()

  const groupIds = (memberships ?? []).map((m) => m.group_id)

  // Fetch pending notifications (both invitations and join requests) for this user
  const now = new Date().toISOString()
  const { data: rawInvitations } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', now)
    .order('created_at', { ascending: true })
    .returns<GroupInvitation[]>()

  let initialNotifications: NotificationItem[] = []

  if (rawInvitations && rawInvitations.length > 0) {
    // Fetch group names for all notification group_ids
    const notifGroupIds = [...new Set(rawInvitations.map((i) => i.group_id))]
    const { data: notifGroups } = await supabase
      .from('consistency_groups')
      .select('id, name')
      .in('id', notifGroupIds)
      .returns<Pick<ConsistencyGroup, 'id' | 'name'>[]>()

    const groupNameMap = new Map((notifGroups ?? []).map((g) => [g.id, g.name]))

    // Fetch from_user usernames for request-type notifications
    const requestInvites = rawInvitations.filter((i) => i.type === 'request')
    const requesterIds = [...new Set(requestInvites.map((i) => i.from_user_id))]
    const usernameMap = new Map<string, string>()

    if (requesterIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profile')
        .select('user_id, username')
        .in('user_id', requesterIds)
        .returns<Pick<UserProfile, 'user_id' | 'username'>[]>()

      for (const p of profiles ?? []) {
        if (p.username) usernameMap.set(p.user_id, p.username)
      }
    }

    initialNotifications = rawInvitations.map((inv) => ({
      invitation: inv,
      group_name: groupNameMap.get(inv.group_id) ?? 'Unknown group',
      from_username: inv.type === 'request' ? usernameMap.get(inv.from_user_id) : undefined,
    }))
  }

  let groups: GroupWithDetails[] = []

  if (groupIds.length > 0) {
    // 2. Fetch groups, all active members, and today's statuses in parallel
    const [groupsResult, membersResult, statusesResult] = await Promise.all([
      supabase
        .from('consistency_groups')
        .select('*')
        .in('id', groupIds)
        .returns<ConsistencyGroup[]>(),

      supabase
        .from('group_members')
        .select('*')
        .in('group_id', groupIds)
        .eq('is_active', true)
        .returns<GroupMember[]>(),

      supabase
        .from('group_daily_status')
        .select('*')
        .in('group_id', groupIds)
        .eq('status_date', today)
        .returns<GroupDailyStatus[]>(),
    ])

    const groupRows = groupsResult.data ?? []
    const memberRows = membersResult.data ?? []
    const statusRows = statusesResult.data ?? []

    const statusMap = new Map<string, boolean>()
    for (const s of statusRows) {
      statusMap.set(`${s.group_id}:${s.user_id}`, s.completed)
    }

    groups = groupRows.map((group) => {
      const groupMembers = memberRows.filter((m) => m.group_id === group.id)
      return {
        ...group,
        member_count: groupMembers.length,
        members: groupMembers.map((m) => ({
          ...m,
          completed_today: statusMap.get(`${group.id}:${m.user_id}`) ?? false,
        })),
      }
    })
  }

  return (
    <GroupView
      initialGroups={groups}
      currentUserId={userId}
      joinError={joinError ?? null}
      initialNotifications={initialNotifications}
    />
  )
}
