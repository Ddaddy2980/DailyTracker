import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { todayInTz } from '@/lib/constants'
import type {
  ConsistencyGroup,
  GroupMember,
  GroupDailyStatus,
  GroupWithDetails,
} from '@/lib/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

// ---------------------------------------------------------------------------
// GET /api/groups/[id]
// Returns a single GroupWithDetails — used to refresh one card after changes.
// Validates that the requesting user is an active member.
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createServerSupabaseClient()
  const tz = req.cookies.get('tz')?.value
  const today = todayInTz(tz)

  // Verify caller is an active member
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', id)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle<{ id: string }>()

  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [groupResult, membersResult, statusesResult] = await Promise.all([
    supabase
      .from('consistency_groups')
      .select('*')
      .eq('id', id)
      .single<ConsistencyGroup>(),

    supabase
      .from('group_members')
      .select('*')
      .eq('group_id', id)
      .eq('is_active', true)
      .returns<GroupMember[]>(),

    supabase
      .from('group_daily_status')
      .select('*')
      .eq('group_id', id)
      .eq('status_date', today)
      .returns<GroupDailyStatus[]>(),
  ])

  if (groupResult.error || !groupResult.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const group = groupResult.data
  const members = membersResult.data ?? []
  const statuses = statusesResult.data ?? []

  const statusMap = new Map<string, boolean>()
  for (const s of statuses) {
    statusMap.set(s.user_id, s.completed)
  }

  const result: GroupWithDetails = {
    ...group,
    member_count: members.length,
    members: members.map((m) => ({
      ...m,
      completed_today: statusMap.get(m.user_id) ?? false,
    })),
  }

  return NextResponse.json({ group: result })
}
