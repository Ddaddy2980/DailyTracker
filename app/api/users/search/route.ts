import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// GET /api/users/search?username=<value>
// Exact username lookup (case-insensitive via lowercase constraint).
// Returns { userId, username } or 404 if not found.
// Used by group owners when sending invitations.
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')?.toLowerCase().trim() ?? ''

  if (username.length === 0) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('user_profile')
    .select('user_id, username')
    .eq('username', username)
    .maybeSingle<{ user_id: string; username: string }>()

  if (error) {
    console.error('users/search: failed to look up username:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Don't allow inviting yourself
  if (data.user_id === userId) {
    return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 })
  }

  return NextResponse.json({ userId: data.user_id, username: data.username })
}
