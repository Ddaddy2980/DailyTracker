import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { todayStr } from '@/lib/constants'
import GroupView from '@/components/groups/GroupView'
import type {
  ConsistencyGroup,
  GroupMember,
  GroupDailyStatus,
  GroupWithDetails,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ joinError?: string }>
}

export default async function GroupsPage({ searchParams }: PageProps) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { joinError } = await searchParams
  const supabase = createServerSupabaseClient()
  const today = todayStr()

  // 1. Get all group_ids this user actively belongs to
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .returns<{ group_id: string }[]>()

  const groupIds = (memberships ?? []).map((m) => m.group_id)

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
    />
  )
}
