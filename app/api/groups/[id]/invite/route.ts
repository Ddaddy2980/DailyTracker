import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { ConsistencyGroup, GroupInvitation, InvitationType } from '@/lib/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export interface PendingInvitationItem {
  invitation:  GroupInvitation
  to_username: string
}

// ---------------------------------------------------------------------------
// GET /api/groups/[id]/invite
// Owner-only: returns pending outgoing invitations they have sent for this group.
// ---------------------------------------------------------------------------
export async function GET(_req: Request, { params }: RouteContext) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: groupId } = await params
  const supabase = createServerSupabaseClient()
  const now = new Date().toISOString()

  // Verify caller is the group owner
  const { data: group } = await supabase
    .from('consistency_groups')
    .select('user_id')
    .eq('id', groupId)
    .single<{ user_id: string }>()

  if (!group || group.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: invitations, error } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('group_id', groupId)
    .eq('from_user_id', userId)
    .eq('type', 'invitation')
    .eq('status', 'pending')
    .gt('expires_at', now)
    .order('created_at', { ascending: true })
    .returns<GroupInvitation[]>()

  if (error) {
    console.error('groups/invite GET: failed to fetch invitations:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!invitations || invitations.length === 0) {
    return NextResponse.json({ invitations: [] })
  }

  // Fetch to_usernames
  const toUserIds = invitations.map((i) => i.to_user_id)
  const { data: profiles } = await supabase
    .from('user_profile')
    .select('user_id, username')
    .in('user_id', toUserIds)
    .returns<{ user_id: string; username: string | null }[]>()

  const usernameMap = new Map(
    (profiles ?? []).map((p) => [p.user_id, p.username ?? 'unknown'])
  )

  const items: PendingInvitationItem[] = invitations.map((inv) => ({
    invitation:  inv,
    to_username: usernameMap.get(inv.to_user_id) ?? 'unknown',
  }))

  return NextResponse.json({ invitations: items })
}

// ---------------------------------------------------------------------------
// POST /api/groups/[id]/invite
// Two uses:
//   type = 'invitation' — owner invites a user by username (owner-only)
//   type = 'request'    — any user requests to join a public group
//
// Body: { toUsername: string, type: 'invitation' | 'request' }
//   For requests, toUsername should be the group owner's user_id resolved
//   client-side, but we look it up server-side from the group row.
// ---------------------------------------------------------------------------
export async function POST(req: Request, { params }: RouteContext) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: groupId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const type = b.type as string

  if (type !== 'invitation' && type !== 'request') {
    return NextResponse.json(
      { error: 'type must be invitation or request' },
      { status: 400 }
    )
  }

  const supabase = createServerSupabaseClient()

  // Fetch group
  const { data: group, error: groupError } = await supabase
    .from('consistency_groups')
    .select('user_id, status, is_public, max_members')
    .eq('id', groupId)
    .single<Pick<ConsistencyGroup, 'user_id' | 'status' | 'is_public' | 'max_members'>>()

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.status !== 'active') {
    return NextResponse.json(
      { error: 'This group is not accepting new members' },
      { status: 400 }
    )
  }

  // Check member cap
  const { count: memberCount } = await supabase
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('is_active', true)

  if ((memberCount ?? 0) >= group.max_members) {
    return NextResponse.json({ error: 'This group is full' }, { status: 400 })
  }

  let fromUserId: string
  let toUserId: string

  if (type === 'invitation') {
    // Only the group owner can send invitations
    if (group.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const toUsername = (b.toUsername as string | undefined)?.trim().toLowerCase()
    if (!toUsername) {
      return NextResponse.json({ error: 'toUsername is required' }, { status: 400 })
    }

    // Resolve username → user_id
    const { data: targetProfile } = await supabase
      .from('user_profile')
      .select('user_id')
      .eq('username', toUsername)
      .maybeSingle<{ user_id: string }>()

    if (!targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetProfile.user_id === userId) {
      return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 })
    }

    fromUserId = userId
    toUserId   = targetProfile.user_id

  } else {
    // type === 'request': any user can request to join a public group
    if (!group.is_public) {
      return NextResponse.json(
        { error: 'This group is private' },
        { status: 403 }
      )
    }

    if (group.user_id === userId) {
      return NextResponse.json(
        { error: 'You are already the owner of this group' },
        { status: 400 }
      )
    }

    fromUserId = userId
    toUserId   = group.user_id  // request goes to the owner
  }

  // Check if target is already an active member
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', type === 'invitation' ? toUserId : userId)
    .eq('is_active', true)
    .maybeSingle<{ id: string }>()

  if (existingMember) {
    return NextResponse.json(
      { error: 'User is already a member of this group' },
      { status: 409 }
    )
  }

  // Insert invitation (unique index on group_id, from_user_id, to_user_id WHERE pending
  // prevents duplicate pending entries)
  const { data: invitation, error: insertError } = await supabase
    .from('group_invitations')
    .insert({
      group_id:     groupId,
      type:         type as InvitationType,
      from_user_id: fromUserId,
      to_user_id:   toUserId,
      status:       'pending',
    })
    .select('*')
    .single<GroupInvitation>()

  if (insertError) {
    // Unique constraint violation = duplicate pending
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'A pending invitation or request already exists' },
        { status: 409 }
      )
    }
    console.error('groups/invite POST: failed to insert invitation:', insertError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ invitation }, { status: 201 })
}

// ---------------------------------------------------------------------------
// DELETE /api/groups/[id]/invite
// Cancel a pending outgoing invitation (owner cancels their own invitation).
// Body: { invitationId: string }
// ---------------------------------------------------------------------------
export async function DELETE(req: Request, { params }: RouteContext) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: groupId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const invitationId = (body as Record<string, unknown>)?.invitationId as string | undefined
  if (!invitationId) {
    return NextResponse.json({ error: 'invitationId is required' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  // Only the sender can cancel
  const { error } = await supabase
    .from('group_invitations')
    .update({ status: 'declined' })
    .eq('id', invitationId)
    .eq('group_id', groupId)
    .eq('from_user_id', userId)
    .eq('status', 'pending')

  if (error) {
    console.error('groups/invite DELETE: failed to cancel invitation:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
