import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { ConsistencyGroup } from '@/lib/types'

export interface DiscoverResult {
  id:             string
  name:           string
  member_count:   number
  owner_username: string
}

// ---------------------------------------------------------------------------
// GET /api/groups/discover?q=<query>
//
// Two search modes — detected by the query value:
//
//   Plain text (e.g. "morning")
//     → case-insensitive partial match on group name
//     → returns up to 10 results across all owners
//
//   @-prefix (e.g. "@david")
//     → case-insensitive partial match on username
//     → returns all public groups owned by any matching user
//
// Both modes:
//   - Public groups only (is_public = true, status = active)
//   - Excludes groups the requesting user already belongs to
//   - Excludes full groups (member_count >= max_members)
//   - Includes owner_username on every result
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('q')?.trim() ?? ''

  if (raw.length === 0) {
    return NextResponse.json({ groups: [] })
  }

  const isUsernameSearch = raw.startsWith('@')
  const query = isUsernameSearch ? raw.slice(1).toLowerCase() : raw

  if (query.length === 0) {
    return NextResponse.json({ groups: [] })
  }

  const supabase = createServerSupabaseClient()

  // Get groups this user already belongs to (exclude from results)
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .returns<{ group_id: string }[]>()

  const excludeIds = (memberships ?? []).map((m) => m.group_id)

  let groups: Pick<ConsistencyGroup, 'id' | 'name' | 'max_members' | 'user_id'>[] = []

  if (isUsernameSearch) {
    // ── @username search ────────────────────────────────────────────────────
    // 1. Find user_profile rows where username partially matches (case-insensitive)
    const { data: profiles } = await supabase
      .from('user_profile')
      .select('user_id')
      .ilike('username', `%${query}%`)
      .neq('user_id', userId)
      .returns<{ user_id: string }[]>()

    const ownerIds = (profiles ?? []).map((p) => p.user_id)

    if (ownerIds.length === 0) {
      return NextResponse.json({ groups: [] })
    }

    // 2. Get their public active groups
    let groupQuery = supabase
      .from('consistency_groups')
      .select('id, name, max_members, user_id')
      .eq('is_public', true)
      .eq('status', 'active')
      .in('user_id', ownerIds)

    if (excludeIds.length > 0) {
      groupQuery = groupQuery.not('id', 'in', `(${excludeIds.join(',')})`)
    }

    const { data, error } = await groupQuery
      .limit(20)
      .returns<Pick<ConsistencyGroup, 'id' | 'name' | 'max_members' | 'user_id'>[]>()

    if (error) {
      console.error('groups/discover @username: failed to fetch groups:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    groups = data ?? []

  } else {
    // ── Group name search ────────────────────────────────────────────────────
    let groupQuery = supabase
      .from('consistency_groups')
      .select('id, name, max_members, user_id')
      .eq('is_public', true)
      .eq('status', 'active')
      .ilike('name', `%${query}%`)

    if (excludeIds.length > 0) {
      groupQuery = groupQuery.not('id', 'in', `(${excludeIds.join(',')})`)
    }

    const { data, error } = await groupQuery
      .limit(10)
      .returns<Pick<ConsistencyGroup, 'id' | 'name' | 'max_members' | 'user_id'>[]>()

    if (error) {
      console.error('groups/discover name: failed to fetch groups:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    groups = data ?? []
  }

  if (groups.length === 0) {
    return NextResponse.json({ groups: [] })
  }

  // Fetch member counts and owner usernames in parallel
  const groupIds  = groups.map((g) => g.id)
  const ownerIds  = [...new Set(groups.map((g) => g.user_id))]

  const [membersResult, profilesResult] = await Promise.all([
    supabase
      .from('group_members')
      .select('group_id')
      .in('group_id', groupIds)
      .eq('is_active', true)
      .returns<{ group_id: string }[]>(),

    supabase
      .from('user_profile')
      .select('user_id, username')
      .in('user_id', ownerIds)
      .returns<{ user_id: string; username: string | null }[]>(),
  ])

  const countMap = new Map<string, number>()
  for (const m of membersResult.data ?? []) {
    countMap.set(m.group_id, (countMap.get(m.group_id) ?? 0) + 1)
  }

  const usernameMap = new Map(
    (profilesResult.data ?? []).map((p) => [p.user_id, p.username ?? 'unknown'])
  )

  const results: DiscoverResult[] = groups
    .map((g) => ({
      id:             g.id,
      name:           g.name,
      member_count:   countMap.get(g.id) ?? 0,
      max_members:    g.max_members,
      owner_username: usernameMap.get(g.user_id) ?? 'unknown',
    }))
    // Exclude full groups
    .filter((g) => g.member_count < g.max_members)
    .map(({ id, name, member_count, owner_username }) => ({
      id, name, member_count, owner_username,
    }))

  return NextResponse.json({ groups: results })
}
