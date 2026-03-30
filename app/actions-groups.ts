'use server'

// =============================================================================
// Group actions — Phase 2.5 (Step 16c)
//
// All group management operations live here, separate from the main actions.ts
// to keep file sizes manageable.  The submitCheckin group_daily_status upsert
// stays in actions.ts (Step 16e) because it is tightly coupled to check-in.
//
// Actions exported:
//   createGroup          — create a new group; caller becomes first member
//   joinGroup            — join by invite code; returns typed error on failure
//   leaveGroup           — soft-delete own membership row
//   getMyGroups          — all active groups for the signed-in user
//   getGroupWithMembers  — single group + all members + today's status
//   renameGroup          — creator only
//   toggleGroupInviteUrl — creator only
//   removeMember         — creator only; soft-deletes another member's row
//   deleteGroup          — creator only; soft-deletes the group
// =============================================================================

import { auth, currentUser } from '@clerk/nextjs/server'
import { revalidatePath }     from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generateInviteCode }         from '@/lib/utils'
import { todayStr, MAX_GROUPS_PER_USER } from '@/lib/constants'
import type {
  ConsistencyGroup,
  GroupMember,
  GroupDailyStatus,
  GroupWithMembers,
  GroupMemberWithStatus,
  GroupStatus,
  PendingJoinNotification,
  GroupDailyFlags,
} from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve a display name for the current Clerk user at join time. */
async function resolveDisplayName(): Promise<string> {
  const user = await currentUser()
  if (!user) throw new Error('Unauthorized')

  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  if (full) return full

  // Fall back to the part of the primary email before the @
  const email = user.emailAddresses?.[0]?.emailAddress ?? ''
  return email.split('@')[0] || 'Member'
}

/** Assert that the caller is the creator of a group; throw otherwise. */
async function assertCreator(sb: ReturnType<typeof createServerSupabaseClient>, groupId: string, userId: string): Promise<void> {
  const { data, error } = await sb
    .from('consistency_groups')
    .select('created_by')
    .eq('id', groupId)
    .single()

  if (error || !data) throw new Error('Group not found')
  if (data.created_by !== userId) throw new Error('Forbidden: caller is not the group creator')
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createGroup(name: string): Promise<ConsistencyGroup> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const trimmed = name.trim()
  if (!trimmed) throw new Error('Group name cannot be empty')
  if (trimmed.length > 30) throw new Error('Group name cannot exceed 30 characters')

  const sb          = createServerSupabaseClient()
  const inviteCode  = await generateInviteCode()
  const displayName = await resolveDisplayName()
  const now         = new Date().toISOString()

  // Insert the group
  const { data: group, error: groupErr } = await sb
    .from('consistency_groups')
    .insert({
      name:               trimmed,
      created_by:         userId,
      invite_code:        inviteCode,
      invite_url_enabled: true,
      max_members:        12,
      created_at:         now,
      status:             'active' satisfies GroupStatus,
    })
    .select()
    .single()

  if (groupErr || !group) throw new Error(`createGroup: ${groupErr?.message ?? 'insert failed'}`)

  // Add creator as first member
  const { error: memberErr } = await sb.from('group_members').insert({
    group_id:     group.id,
    user_id:      userId,
    display_name: displayName,
    joined_at:    now,
    active:       true,
  })
  if (memberErr) throw new Error(`createGroup member insert: ${memberErr.message}`)

  revalidatePath('/')
  revalidatePath('/challenge')
  revalidatePath('/jamming')
  revalidatePath('/grooving')
  return group as ConsistencyGroup
}

// ── Join ──────────────────────────────────────────────────────────────────────

type JoinResult =
  | { success: true;  group: ConsistencyGroup }
  | { success: false; error: 'not_found' | 'inactive' | 'full' | 'already_member' | 'limit_reached' }

export async function joinGroup(rawCode: string): Promise<JoinResult> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const inviteCode = rawCode.trim().toUpperCase()
  const sb         = createServerSupabaseClient()

  // Look up group by invite code
  const { data: group, error: groupErr } = await sb
    .from('consistency_groups')
    .select('*')
    .eq('invite_code', inviteCode)
    .maybeSingle()

  if (groupErr) throw new Error(`joinGroup lookup: ${groupErr.message}`)
  if (!group)                        return { success: false, error: 'not_found' }
  if (group.status !== 'active')     return { success: false, error: 'inactive' }

  // Check for an existing membership row (active or inactive)
  const { data: existingRow } = await sb
    .from('group_members')
    .select('id, active')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingRow?.active) return { success: false, error: 'already_member' }

  // Enforce per-user group limit — count all active memberships across every group
  if (!existingRow) {
    // Only check when this would be a net-new membership (not a re-activation)
    const { count: userGroupCount, error: limitErr } = await sb
      .from('group_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('active', true)

    if (limitErr) throw new Error(`joinGroup limit check: ${limitErr.message}`)
    if ((userGroupCount ?? 0) >= MAX_GROUPS_PER_USER) {
      return { success: false, error: 'limit_reached' }
    }
  }

  // Count current active members
  const { count, error: countErr } = await sb
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', group.id)
    .eq('active', true)

  if (countErr) throw new Error(`joinGroup count: ${countErr.message}`)
  if ((count ?? 0) >= group.max_members) return { success: false, error: 'full' }

  const displayName = await resolveDisplayName()
  const now         = new Date().toISOString()

  if (existingRow) {
    // Re-activate a previously inactive membership row
    const { error: reactivateErr } = await sb
      .from('group_members')
      .update({ active: true, display_name: displayName, joined_at: now })
      .eq('id', existingRow.id)
    if (reactivateErr) throw new Error(`joinGroup reactivate: ${reactivateErr.message}`)
  } else {
    // Fresh join — insert new membership row
    const { error: insertErr } = await sb.from('group_members').insert({
      group_id:     group.id,
      user_id:      userId,
      display_name: displayName,
      joined_at:    now,
      active:       true,
    })
    if (insertErr) throw new Error(`joinGroup insert: ${insertErr.message}`)
  }

  // Step 16g — write ephemeral join notification to the creator's profile.
  // Non-fatal: errors are logged but never block the join.
  const notification: PendingJoinNotification = {
    memberName: displayName,
    groupName:  group.name,
    seenAt:     null,
  }
  const { error: notifErr } = await sb
    .from('user_profile')
    .update({ pending_join_notification: notification })
    .eq('user_id', group.created_by as string)
  if (notifErr) console.error('joinGroup notification write:', notifErr)

  revalidatePath('/')
  revalidatePath('/challenge')
  revalidatePath('/jamming')
  revalidatePath('/grooving')
  return { success: true, group: group as ConsistencyGroup }
}

// ── Leave ─────────────────────────────────────────────────────────────────────

export async function leaveGroup(groupId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()

  // Block creators from leaving if other members are still active.
  // Creators must delete the group instead (ownership transfer is not yet supported).
  const { data: groupRow } = await sb
    .from('consistency_groups')
    .select('created_by')
    .eq('id', groupId)
    .single()

  if (groupRow?.created_by === userId) {
    const { count } = await sb
      .from('group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('active', true)
      .neq('user_id', userId)

    if ((count ?? 0) > 0) {
      throw new Error(
        "You're the group creator. Delete the group instead — you can't leave while others are members."
      )
    }
  }

  const { error } = await sb
    .from('group_members')
    .update({ active: false })
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) throw new Error(`leaveGroup: ${error.message}`)
  revalidatePath('/')
  revalidatePath('/challenge')
  revalidatePath('/jamming')
  revalidatePath('/grooving')
}

// ── Read ──────────────────────────────────────────────────────────────────────

/** Returns all active groups the signed-in user belongs to. */
export async function getMyGroups(): Promise<ConsistencyGroup[]> {
  const { userId } = await auth()
  if (!userId) return []

  const sb = createServerSupabaseClient()

  // Fetch active member rows for this user
  const { data: memberRows, error: memberErr } = await sb
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .eq('active', true)

  if (memberErr) { console.error('getMyGroups members:', memberErr); return [] }
  if (!memberRows?.length) return []

  const groupIds = memberRows.map(r => r.group_id as string)

  const { data: groups, error: groupErr } = await sb
    .from('consistency_groups')
    .select('*')
    .in('id', groupIds)
    .eq('status', 'active')

  if (groupErr) { console.error('getMyGroups groups:', groupErr); return [] }
  return (groups ?? []) as ConsistencyGroup[]
}

/**
 * Returns a single group with all active members and their today's status.
 * Returns null if the group doesn't exist or the caller is not an active member.
 *
 * Member ordering is handled here (current user first, then alphabetical) so
 * dashboard components receive a pre-sorted list.
 */
export async function getGroupWithMembers(groupId: string): Promise<GroupWithMembers | null> {
  const { userId } = await auth()
  if (!userId) return null

  const sb    = createServerSupabaseClient()
  const today = todayStr()

  // Fetch group, members, today's status, and the current user's join notification in parallel
  const [groupRes, membersRes, statusRes, profileRes] = await Promise.all([
    sb.from('consistency_groups').select('*').eq('id', groupId).eq('status', 'active').single(),
    sb.from('group_members').select('*').eq('group_id', groupId).eq('active', true),
    sb.from('group_daily_status').select('*').eq('group_id', groupId).eq('status_date', today),
    sb.from('user_profile').select('pending_join_notification').eq('user_id', userId).maybeSingle(),
  ])

  if (groupRes.error || !groupRes.data) return null

  // Confirm caller is an active member (RLS safety net on top of this explicit check)
  const members = (membersRes.data ?? []) as GroupMember[]
  const isMember = members.some(m => m.user_id === userId)
  if (!isMember) return null

  const statusMap = new Map<string, GroupDailyStatus>(
    ((statusRes.data ?? []) as GroupDailyStatus[]).map(s => [s.user_id, s])
  )

  // Build GroupMemberWithStatus array, sorted: current user first, then A–Z
  const membersWithStatus: GroupMemberWithStatus[] = members
    .map(m => ({
      ...m,
      isCurrentUser: m.user_id === userId,
      todayStatus:   statusMap.get(m.user_id) ?? null,
    }))
    .sort((a, b) => {
      if (a.isCurrentUser) return -1
      if (b.isCurrentUser) return  1
      return a.display_name.localeCompare(b.display_name)
    })

  // Include the join notification only for the group creator (it's their profile field).
  // Members have no pending_join_notification relevant to this group.
  const isCreator = groupRes.data.created_by === userId
  const pendingJoinNotification: PendingJoinNotification | null = isCreator
    ? ((profileRes.data?.pending_join_notification as PendingJoinNotification | null) ?? null)
    : null

  return {
    ...(groupRes.data as ConsistencyGroup),
    members: membersWithStatus,
    pendingJoinNotification,
  }
}

// ── Creator management ────────────────────────────────────────────────────────

export async function renameGroup(groupId: string, name: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const trimmed = name.trim()
  if (!trimmed) throw new Error('Group name cannot be empty')
  if (trimmed.length > 30) throw new Error('Group name cannot exceed 30 characters')

  const sb = createServerSupabaseClient()
  await assertCreator(sb, groupId, userId)

  const { error } = await sb
    .from('consistency_groups')
    .update({ name: trimmed })
    .eq('id', groupId)

  if (error) throw new Error(`renameGroup: ${error.message}`)
  revalidatePath('/')
  revalidatePath('/challenge')
  revalidatePath('/jamming')
  revalidatePath('/grooving')
}

export async function toggleGroupInviteUrl(groupId: string, enabled: boolean): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  await assertCreator(sb, groupId, userId)

  const { error } = await sb
    .from('consistency_groups')
    .update({ invite_url_enabled: enabled })
    .eq('id', groupId)

  if (error) throw new Error(`toggleGroupInviteUrl: ${error.message}`)
  revalidatePath('/')
  revalidatePath('/challenge')
  revalidatePath('/jamming')
  revalidatePath('/grooving')
}

export async function removeMember(groupId: string, targetUserId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // Creator cannot remove themselves — they must use deleteGroup or leaveGroup
  if (targetUserId === userId) throw new Error('Use leaveGroup to remove yourself from a group')

  const sb = createServerSupabaseClient()
  await assertCreator(sb, groupId, userId)

  const { error } = await sb
    .from('group_members')
    .update({ active: false })
    .eq('group_id', groupId)
    .eq('user_id', targetUserId)

  if (error) throw new Error(`removeMember: ${error.message}`)
  revalidatePath('/')
  revalidatePath('/challenge')
  revalidatePath('/jamming')
  revalidatePath('/grooving')
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  await assertCreator(sb, groupId, userId)

  const { error } = await sb
    .from('consistency_groups')
    .update({ status: 'deleted' satisfies GroupStatus })
    .eq('id', groupId)

  if (error) throw new Error(`deleteGroup: ${error.message}`)
  revalidatePath('/')
  revalidatePath('/challenge')
  revalidatePath('/jamming')
  revalidatePath('/grooving')
}

// ── Status transitions (creator only) ────────────────────────────────────────

/** Pause an active group. Members can no longer check in; group is preserved. */
export async function pauseGroup(groupId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  await assertCreator(sb, groupId, userId)

  const { error } = await sb
    .from('consistency_groups')
    .update({ status: 'paused' satisfies GroupStatus })
    .eq('id', groupId)

  if (error) throw new Error(`pauseGroup: ${error.message}`)
  revalidatePath('/')
  revalidatePath('/challenge')
  revalidatePath('/jamming')
  revalidatePath('/grooving')
}

/** Resume a paused group — sets status back to 'active'. */
export async function resumeGroup(groupId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  await assertCreator(sb, groupId, userId)

  const { error } = await sb
    .from('consistency_groups')
    .update({ status: 'active' satisfies GroupStatus })
    .eq('id', groupId)

  if (error) throw new Error(`resumeGroup: ${error.message}`)
  revalidatePath('/')
  revalidatePath('/challenge')
  revalidatePath('/jamming')
  revalidatePath('/grooving')
}

/**
 * Archive a group — preserves all history; creator can reactivate later.
 * Records archived_at timestamp.
 */
export async function archiveGroup(groupId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  await assertCreator(sb, groupId, userId)

  const { error } = await sb
    .from('consistency_groups')
    .update({
      status:      'archived' satisfies GroupStatus,
      archived_at: new Date().toISOString(),
    })
    .eq('id', groupId)

  if (error) throw new Error(`archiveGroup: ${error.message}`)
  revalidatePath('/')
  revalidatePath('/challenge')
  revalidatePath('/jamming')
  revalidatePath('/grooving')
}

/** Reactivate an archived group — clears archived_at, sets status back to 'active'. */
export async function reactivateGroup(groupId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  await assertCreator(sb, groupId, userId)

  const { error } = await sb
    .from('consistency_groups')
    .update({
      status:      'active' satisfies GroupStatus,
      archived_at: null,
    })
    .eq('id', groupId)

  if (error) throw new Error(`reactivateGroup: ${error.message}`)
  revalidatePath('/')
  revalidatePath('/challenge')
  revalidatePath('/jamming')
  revalidatePath('/grooving')
}

// ── Step 16g notification actions ────────────────────────────────────────────

/**
 * Dismiss the "member joined" banner for the current user (must be the group creator).
 * Sets seenAt to the current timestamp on the pending_join_notification JSONB field.
 */
export async function clearJoinNotification(groupId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  await assertCreator(sb, groupId, userId)

  // Read current notification before updating seenAt
  const { data: profile } = await sb
    .from('user_profile')
    .select('pending_join_notification')
    .eq('user_id', userId)
    .maybeSingle()

  if (!profile?.pending_join_notification) return

  const updated: PendingJoinNotification = {
    ...(profile.pending_join_notification as PendingJoinNotification),
    seenAt: new Date().toISOString(),
  }

  const { error } = await sb
    .from('user_profile')
    .update({ pending_join_notification: updated })
    .eq('user_id', userId)

  if (error) throw new Error(`clearJoinNotification: ${error.message}`)
  revalidatePath('/')
  revalidatePath('/challenge')
  revalidatePath('/jamming')
  revalidatePath('/grooving')
}

/**
 * Mark the full-group-day flag as notified so the celebratory banner
 * does not re-render after the first display.  Called by all members on render.
 */
export async function markFullGroupDayNotified(groupId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()

  const { data: groupRow } = await sb
    .from('consistency_groups')
    .select('group_daily_flags')
    .eq('id', groupId)
    .maybeSingle()

  if (!groupRow?.group_daily_flags) return

  const updated: GroupDailyFlags = {
    ...(groupRow.group_daily_flags as GroupDailyFlags),
    notified: true,
  }

  const { error } = await sb
    .from('consistency_groups')
    .update({ group_daily_flags: updated })
    .eq('id', groupId)

  if (error) throw new Error(`markFullGroupDayNotified: ${error.message}`)
  // No revalidatePath — this is a silent background write; the banner
  // already shows and disappears via local state on the client.
}
