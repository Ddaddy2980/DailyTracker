import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { todayInTz } from '@/lib/constants'
import type { GroupInvitation, ConsistencyGroup } from '@/lib/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

// ---------------------------------------------------------------------------
// POST /api/groups/invitations/[id]/respond
// Body: { action: 'accept' | 'decline' }
//
// The responding user must be the to_user_id on the invitation.
//
// For type='invitation': to_user_id = invited user → they become the new member
// For type='request':    to_user_id = group owner  → from_user_id becomes new member
//
// On accept: inserts group_members row, syncs today's status if applicable.
// On decline: sets status = 'declined'.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tz = req.cookies.get('tz')?.value
  const today = todayInTz(tz)

  const { id: invitationId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = (body as Record<string, unknown>)?.action as string
  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json(
      { error: 'action must be accept or decline' },
      { status: 400 }
    )
  }

  const supabase = createServerSupabaseClient()
  const now = new Date().toISOString()

  // Fetch invitation and verify this user is the recipient
  const { data: invitation, error: fetchError } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', now)
    .maybeSingle<GroupInvitation>()

  if (fetchError) {
    console.error('invitations/respond: failed to fetch invitation:', fetchError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!invitation) {
    return NextResponse.json(
      { error: 'Invitation not found or already responded' },
      { status: 404 }
    )
  }

  if (action === 'decline') {
    const { error: declineError } = await supabase
      .from('group_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId)

    if (declineError) {
      console.error('invitations/respond: failed to decline invitation:', declineError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  // action === 'accept'

  // Determine who becomes the new member:
  //   invitation → the invited user (to_user_id = current user)
  //   request    → the requester   (from_user_id)
  const memberUserId =
    invitation.type === 'request' ? invitation.from_user_id : userId

  // Verify group is still active and has space
  const { data: group, error: groupError } = await supabase
    .from('consistency_groups')
    .select('status, max_members')
    .eq('id', invitation.group_id)
    .single<Pick<ConsistencyGroup, 'status' | 'max_members'>>()

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.status !== 'active') {
    return NextResponse.json(
      { error: 'This group is no longer active' },
      { status: 400 }
    )
  }

  const { count: memberCount } = await supabase
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', invitation.group_id)
    .eq('is_active', true)

  if ((memberCount ?? 0) >= group.max_members) {
    return NextResponse.json({ error: 'This group is full' }, { status: 400 })
  }

  // Get username for display_name (use the member's profile, not the responder's)
  const { data: profile } = await supabase
    .from('user_profile')
    .select('username')
    .eq('user_id', memberUserId)
    .single<{ username: string | null }>()

  const displayName = profile?.username ?? ''

  // Check for an existing (inactive) membership row to re-activate
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('id, is_active')
    .eq('group_id', invitation.group_id)
    .eq('user_id', memberUserId)
    .maybeSingle<{ id: string; is_active: boolean }>()

  if (existingMember?.is_active) {
    // Already a member — just mark invitation accepted and return
    const { error: alreadyAcceptError } = await supabase
      .from('group_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId)
    if (alreadyAcceptError) {
      console.error('invitations/respond: failed to mark already-active invitation accepted:', alreadyAcceptError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, groupId: invitation.group_id })
  }

  if (existingMember) {
    // Re-activating a former member — must succeed before marking invitation accepted
    const { error: reactivateError } = await supabase
      .from('group_members')
      .update({ is_active: true, display_name: displayName })
      .eq('id', existingMember.id)
    if (reactivateError) {
      console.error('invitations/respond: failed to re-activate member:', reactivateError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  } else {
    const { error: insertError } = await supabase
      .from('group_members')
      .insert({
        group_id:     invitation.group_id,
        user_id:      memberUserId,
        display_name: displayName,
        is_active:    true,
      })

    if (insertError) {
      console.error('invitations/respond: failed to insert member:', insertError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }

  // Mark invitation accepted
  const { error: acceptUpdateError } = await supabase
    .from('group_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId)
  if (acceptUpdateError) {
    // Member row already inserted — log but don't fail the request.
    // The member is in the group; the invitation row is a secondary record.
    console.error('invitations/respond: failed to mark invitation accepted (member was added):', acceptUpdateError)
  }

  // If the new member has completed a pillar today, mark them green immediately
  const { data: todayEntry } = await supabase
    .from('pillar_daily_entries')
    .select('id')
    .eq('user_id', memberUserId)
    .eq('entry_date', today)
    .eq('completed', true)
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (todayEntry) {
    await supabase
      .from('group_daily_status')
      .upsert(
        {
          group_id:    invitation.group_id,
          user_id:     memberUserId,
          status_date: today,
          completed:   true,
        },
        { onConflict: 'group_id,user_id,status_date' }
      )
  }

  return NextResponse.json({ ok: true, groupId: invitation.group_id })
}
