import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { todayStr } from '@/lib/constants'
import type {
  ConsistencyGroup,
  GroupMember,
  GroupDailyStatus,
  GroupWithDetails,
  UserProfile,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// GET /api/groups
// Returns all groups the authenticated user is an active member of,
// with all active members and today's check-in status for each member.
// ---------------------------------------------------------------------------
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()
  const today = todayStr()

  // 1. Get all group_ids this user actively belongs to
  const { data: memberships, error: membershipError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .returns<{ group_id: string }[]>()

  if (membershipError) {
    console.error('groups GET: failed to fetch memberships:', membershipError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ groups: [] })
  }

  const groupIds = memberships.map((m) => m.group_id)

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

  if (groupsResult.error) {
    console.error('groups GET: failed to fetch groups:', groupsResult.error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const groups = groupsResult.data ?? []
  const members = membersResult.data ?? []
  const statuses = statusesResult.data ?? []

  // 3. Assemble GroupWithDetails for each group
  const statusMap = new Map<string, boolean>()
  for (const s of statuses) {
    statusMap.set(`${s.group_id}:${s.user_id}`, s.completed)
  }

  const result: GroupWithDetails[] = groups.map((group) => {
    const groupMembers = members.filter((m) => m.group_id === group.id)
    return {
      ...group,
      member_count: groupMembers.length,
      members: groupMembers.map((m) => ({
        ...m,
        completed_today: statusMap.get(`${group.id}:${m.user_id}`) ?? false,
      })),
    }
  })

  return NextResponse.json({ groups: result })
}

// ---------------------------------------------------------------------------
// POST /api/groups
// Body: { name: string }
// Creates a new group and adds the creator as the first member.
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).name !== 'string' ||
    ((body as Record<string, unknown>).name as string).trim().length === 0
  ) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const name = ((body as Record<string, unknown>).name as string).trim()

  const supabase = createServerSupabaseClient()

  // Get display name from user_profile.username (source of truth for group identity)
  const { data: profileRow } = await supabase
    .from('user_profile')
    .select('username')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'username'>>()

  const displayName = profileRow?.username ?? ''

  // invite_code is a retired feature but the column is NOT NULL UNIQUE — satisfy it
  // with a UUID (never exposed to users; real join flow uses invitations).
  const inviteCode = crypto.randomUUID()

  // Insert the group
  const { data: group, error: groupError } = await supabase
    .from('consistency_groups')
    .insert({
      user_id:     userId,
      name,
      invite_code: inviteCode,
      max_members: 10,
      status:      'active',
    })
    .select('*')
    .single<ConsistencyGroup>()

  if (groupError || !group) {
    console.error('groups POST: failed to create group:', groupError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Add creator as first member
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id:     group.id,
      user_id:      userId,
      display_name: displayName,
      is_active:    true,
    })

  if (memberError) {
    console.error('groups POST: failed to add creator as member:', memberError)
    // Clean up the orphaned group
    await supabase.from('consistency_groups').delete().eq('id', group.id)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const result: GroupWithDetails = {
    ...group,
    member_count: 1,
    members: [
      {
        id:           '',
        group_id:     group.id,
        user_id:      userId,
        display_name: displayName,
        joined_at:    new Date().toISOString(),
        is_active:    true,
        completed_today: false,
      },
    ],
  }

  return NextResponse.json({ group: result }, { status: 201 })
}
