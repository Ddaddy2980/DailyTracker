import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { ConsistencyGroup } from '@/lib/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

type ManageAction = 'rename' | 'toggle_invite' | 'toggle_public' | 'delete'

interface ManageBody {
  action: ManageAction
  name?: string
}

function isManageBody(v: unknown): v is ManageBody {
  if (typeof v !== 'object' || v === null) return false
  const b = v as Record<string, unknown>
  if (!['rename', 'toggle_invite', 'toggle_public', 'delete'].includes(b.action as string)) return false
  if (b.action === 'rename' && typeof b.name !== 'string') return false
  return true
}

// ---------------------------------------------------------------------------
// PATCH /api/groups/[id]/manage
// Creator-only actions: rename, toggle_invite, delete.
//
// rename       — updates the group name
// toggle_invite — flips status between 'active' and 'paused'
//                 (paused = invite link disabled; existing members unaffected)
// delete       — hard deletes the group (CASCADE removes members + status rows)
// ---------------------------------------------------------------------------
export async function PATCH(req: Request, { params }: RouteContext) {
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

  if (!isManageBody(body)) {
    return NextResponse.json(
      { error: 'action must be rename | toggle_invite | delete' },
      { status: 400 }
    )
  }

  const supabase = createServerSupabaseClient()

  // Fetch group and verify caller is the creator
  const { data: group, error: groupError } = await supabase
    .from('consistency_groups')
    .select('user_id, status, is_public')
    .eq('id', groupId)
    .single<Pick<ConsistencyGroup, 'user_id' | 'status' | 'is_public'>>()

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (body.action === 'delete') {
    const { error: deleteError } = await supabase
      .from('consistency_groups')
      .delete()
      .eq('id', groupId)

    if (deleteError) {
      console.error('groups/manage DELETE: failed to delete group:', deleteError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (body.action === 'rename') {
    const name = (body.name as string).trim()
    if (name.length === 0) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    }

    const { error: renameError } = await supabase
      .from('consistency_groups')
      .update({ name })
      .eq('id', groupId)

    if (renameError) {
      console.error('groups/manage rename: failed:', renameError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (body.action === 'toggle_invite') {
    // 'active' → 'paused' (invite disabled), 'paused' → 'active' (invite re-enabled)
    const newStatus = group.status === 'active' ? 'paused' : 'active'

    const { error: toggleError } = await supabase
      .from('consistency_groups')
      .update({ status: newStatus })
      .eq('id', groupId)

    if (toggleError) {
      console.error('groups/manage toggle_invite: failed:', toggleError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: newStatus })
  }

  if (body.action === 'toggle_public') {
    const newIsPublic = !group.is_public

    const { error: toggleError } = await supabase
      .from('consistency_groups')
      .update({ is_public: newIsPublic })
      .eq('id', groupId)

    if (toggleError) {
      console.error('groups/manage toggle_public: failed:', toggleError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ success: true, is_public: newIsPublic })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
