import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { todayStr, PILLAR_ORDER } from '@/lib/constants'
import type { UserProfile, ChallengeDuration } from '@/lib/types'

interface GoalEntry {
  pillar:    string
  goal_text: string
  activate:  boolean
}

function isGoalEntry(v: unknown): v is GoalEntry {
  if (typeof v !== 'object' || v === null) return false
  const g = v as Record<string, unknown>
  return (
    typeof g.pillar === 'string' &&
    typeof g.goal_text === 'string' &&
    typeof g.activate === 'boolean'
  )
}

const VALID_PILLAR_NAMES = new Set<string>(PILLAR_ORDER)

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
    !('goals' in body) ||
    !Array.isArray((body as { goals: unknown }).goals) ||
    !(body as { goals: unknown[] }).goals.every(isGoalEntry) ||
    !(body as { goals: GoalEntry[] }).goals.every((g) => VALID_PILLAR_NAMES.has(g.pillar))
  ) {
    return NextResponse.json({ error: 'Invalid goals payload' }, { status: 400 })
  }

  const goals = (body as { goals: GoalEntry[] }).goals
  const supabase = createServerSupabaseClient()

  // Fetch selected_duration_days from user_profile
  const { data: profile, error: profileReadError } = await supabase
    .from('user_profile')
    .select('selected_duration_days')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'selected_duration_days'>>()

  if (profileReadError) {
    console.error('Failed to read user_profile:', profileReadError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const durationDays: ChallengeDuration =
    (profile?.selected_duration_days as ChallengeDuration | null) ?? 30

  const activeGoals = goals.filter((g) => g.activate && g.goal_text.trim().length > 0)

  if (activeGoals.length === 0) {
    return NextResponse.json(
      { error: 'At least one active pillar with a goal is required' },
      { status: 400 }
    )
  }

  // Insert duration goals for active pillars
  const goalRows = activeGoals.map((g) => ({
    user_id:   userId,
    pillar:    g.pillar,
    goal_text: g.goal_text.trim(),
    is_active: true,
  }))

  const { error: goalsError } = await supabase
    .from('duration_goals')
    .insert(goalRows)

  if (goalsError) {
    console.error('Failed to insert duration_goals:', goalsError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Activate pillar_levels for chosen pillars
  const activePillars = activeGoals.map((g) => g.pillar)

  const { error: pillarError } = await supabase
    .from('pillar_levels')
    .update({ is_active: true })
    .eq('user_id', userId)
    .in('pillar', activePillars)

  if (pillarError) {
    console.error('Failed to activate pillar_levels:', pillarError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Create the challenge row
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .insert({
      user_id:       userId,
      duration_days: durationDays,
      start_date:    todayStr(),
      status:        'active',
    })
    .select('id')
    .single<{ id: string }>()

  if (challengeError || !challenge) {
    console.error('Failed to create challenge:', challengeError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Update user_profile to complete onboarding
  const { error: profileUpdateError } = await supabase
    .from('user_profile')
    .update({
      active_challenge_id: challenge.id,
      goals_setup_completed: true,
      onboarding_completed:  true,
    })
    .eq('user_id', userId)

  if (profileUpdateError) {
    console.error('Failed to finalize user_profile:', profileUpdateError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
