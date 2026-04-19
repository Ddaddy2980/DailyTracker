import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'

// Validation: lowercase, 3–20 chars, alphanumeric + underscore only
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

// ---------------------------------------------------------------------------
// GET /api/onboarding/username?username=<value>
// Returns { available: boolean }
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')?.toLowerCase() ?? ''

  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json({ available: false })
  }

  const supabase = createServerSupabaseClient()

  const { data } = await supabase
    .from('user_profile')
    .select('user_id')
    .eq('username', username)
    .neq('user_id', userId)
    .maybeSingle<{ user_id: string }>()

  return NextResponse.json({ available: data === null })
}

// ---------------------------------------------------------------------------
// POST /api/onboarding/username
// Body: { username: string }
// Saves username and flips username_set = true
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

  const raw = (body as Record<string, unknown>)?.username
  if (typeof raw !== 'string') {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const username = raw.trim().toLowerCase()

  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      { error: 'Username must be 3–20 characters, lowercase letters, numbers, and underscores only' },
      { status: 400 }
    )
  }

  const supabase = createServerSupabaseClient()

  // Check availability (excluding this user in case of re-submission)
  const { data: conflict } = await supabase
    .from('user_profile')
    .select('user_id')
    .eq('username', username)
    .neq('user_id', userId)
    .maybeSingle<{ user_id: string }>()

  if (conflict) {
    return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
  }

  const { error } = await supabase
    .from('user_profile')
    .update({ username, username_set: true })
    .eq('user_id', userId)
    .returns<UserProfile>()

  if (error) {
    console.error('onboarding/username POST: failed to save username:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
