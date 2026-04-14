import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { todayStr } from '@/lib/constants'
import type { ConsistencyGroup, GroupMember } from '@/lib/types'

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
    typeof (body as Record<string, unknown>).inviteCode !== 'string' ||
    ((body as Record<string, unknown>).inviteCode as string).trim().length === 0
  ) {
    return NextResponse.json({ error: 'inviteCode is required' }, { status: 400 })
  }

  const inviteCode = ((body as Record<string, unknown>).inviteCode as string)
    .trim()
    .toUpperCase()

  const supabase = createServerSupabaseClient()

  // Look up the group by invite code
  const { data: group, error: groupError } = await supabase
    .from('consistency_groups')
    .select('*')
    .eq('invite_code', inviteCode)
    .maybeSingle<ConsistencyGroup>()

  if (groupError) {
    console.error('groups/join: failed to look up group:', groupError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!group) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  if (group.status !== 'active') {
    return NextResponse.json(
      { error: 'This group is no longer accepting new members' },
      { status: 400 }
    )
  }

  // Check if user is already an active member
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('id, is_active')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .maybeSingle<Pick<GroupMember, 'id' | 'is_active'>>()

  if (existingMember?.is_active) {
    return NextResponse.json({ error: 'Already a member of this group', groupId: group.id }, { status: 409 })
  }

  // Count current active members to enforce cap
  const { count, error: countError } = await supabase
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', group.id)
    .eq('is_active', true)

  if (countError) {
    console.error('groups/join: failed to count members:', countError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if ((count ?? 0) >= group.max_members) {
    return NextResponse.json(
      { error: 'This group is full' },
      { status: 400 }
    )
  }

  // Get display name from Clerk
  const clerkUser = await currentUser()
  const displayName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') ||
    'Member'

  // If user previously left (is_active = false), re-activate rather than insert
  if (existingMember) {
    const { error: reactivateError } = await supabase
      .from('group_members')
      .update({ is_active: true, display_name: displayName })
      .eq('id', existingMember.id)

    if (reactivateError) {
      console.error('groups/join: failed to reactivate member:', reactivateError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  } else {
    const { error: insertError } = await supabase
      .from('group_members')
      .insert({
        group_id:     group.id,
        user_id:      userId,
        display_name: displayName,
        is_active:    true,
      })

    if (insertError) {
      console.error('groups/join: failed to insert member:', insertError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }

  // If the user has already checked in on any pillar today, immediately mark them green
  const { data: todayEntry } = await supabase
    .from('pillar_daily_entries')
    .select('id')
    .eq('user_id', userId)
    .eq('entry_date', todayStr())
    .eq('completed', true)
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (todayEntry) {
    await supabase
      .from('group_daily_status')
      .upsert(
        {
          group_id:    group.id,
          user_id:     userId,
          status_date: todayStr(),
          completed:   true,
        },
        { onConflict: 'group_id,user_id,status_date' }
      )
  }

  return NextResponse.json({ groupId: group.id }, { status: 201 })
}
