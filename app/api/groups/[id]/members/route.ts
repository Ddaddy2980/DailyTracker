import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { ConsistencyGroup, GroupMember } from '@/lib/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

// ---------------------------------------------------------------------------
// DELETE /api/groups/[id]/members
// Body: { targetUserId: string }
//
// Creator can remove any member.
// Non-creator can only remove themselves (leave).
// Sets group_members.is_active = false (soft delete).
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

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).targetUserId !== 'string'
  ) {
    return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 })
  }

  const targetUserId = (body as Record<string, unknown>).targetUserId as string

  const supabase = createServerSupabaseClient()

  // Fetch group to determine creator
  const { data: group, error: groupError } = await supabase
    .from('consistency_groups')
    .select('user_id')
    .eq('id', groupId)
    .single<Pick<ConsistencyGroup, 'user_id'>>()

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  const isCreator = group.user_id === userId

  // Non-creator can only remove themselves
  if (!isCreator && targetUserId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify target is currently an active member
  const { data: member } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', targetUserId)
    .eq('is_active', true)
    .maybeSingle<Pick<GroupMember, 'id'>>()

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from('group_members')
    .update({ is_active: false })
    .eq('group_id', groupId)
    .eq('user_id', targetUserId)

  if (updateError) {
    console.error('groups/members DELETE: failed to deactivate member:', updateError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
