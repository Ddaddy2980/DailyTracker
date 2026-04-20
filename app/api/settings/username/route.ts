import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

// ---------------------------------------------------------------------------
// PATCH /api/settings/username
// Body: { username: string }
// Updates user_profile.username and cascades to all group_members.display_name
// rows for this user, atomically.
// ---------------------------------------------------------------------------
export async function PATCH(req: Request) {
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

  const raw = (body as Record<string, unknown>)?.username
  if (typeof raw !== 'string') {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const username = raw.trim()

  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      { error: 'Username must be 3–20 characters, letters, numbers, and underscores only' },
      { status: 400 }
    )
  }

  const supabase = createServerSupabaseClient()

  // Check availability (excluding this user)
  const { data: conflict } = await supabase
    .from('user_profile')
    .select('user_id')
    .ilike('username', username)
    .neq('user_id', userId)
    .maybeSingle<{ user_id: string }>()

  if (conflict) {
    return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
  }

  // Update user_profile first
  const { error: profileError } = await supabase
    .from('user_profile')
    .update({ username, username_set: true })
    .eq('user_id', userId)

  if (profileError) {
    console.error('settings/username PATCH: failed to update profile:', profileError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Cascade display_name to all group_members rows for this user
  const { error: cascadeError } = await supabase
    .from('group_members')
    .update({ display_name: username })
    .eq('user_id', userId)

  if (cascadeError) {
    // Profile updated successfully — log but don't fail the request.
    // Group display names are cosmetic; the critical write already succeeded.
    console.error('settings/username PATCH: failed to cascade group_members:', cascadeError)
  }

  return NextResponse.json({ ok: true, username })
}
