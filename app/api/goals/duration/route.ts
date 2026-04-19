import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { PILLAR_ORDER, DURATION_GOAL_CAP } from '@/lib/constants'
import type { PillarLevel, DurationGoal, LevelNumber } from '@/lib/types'

const VALID_PILLARS = new Set<string>(PILLAR_ORDER)

// ── POST — add a new duration goal ───────────────────────────────────────────

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
    typeof (body as Record<string, unknown>).pillar !== 'string' ||
    typeof (body as Record<string, unknown>).goal_text !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { pillar, goal_text } = body as { pillar: string; goal_text: string }

  if (!VALID_PILLARS.has(pillar)) {
    return NextResponse.json({ error: 'Invalid pillar' }, { status: 400 })
  }

  const trimmedText = goal_text.trim()
  if (trimmedText.length === 0) {
    return NextResponse.json({ error: 'Goal text cannot be empty' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  // Fetch current level for this pillar to check cap
  const { data: pillarLevel, error: levelError } = await supabase
    .from('pillar_levels')
    .select('level')
    .eq('user_id', userId)
    .eq('pillar', pillar)
    .single<Pick<PillarLevel, 'level'>>()

  if (levelError || !pillarLevel) {
    console.error('POST /api/goals/duration: failed to fetch pillar level:', levelError)
    return NextResponse.json({ error: 'Could not verify level' }, { status: 500 })
  }

  const level = pillarLevel.level as LevelNumber
  const cap   = DURATION_GOAL_CAP[level]

  // Count existing active goals for this pillar
  const { count, error: countError } = await supabase
    .from('duration_goals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('pillar', pillar)
    .eq('is_active', true)

  if (countError) {
    console.error('POST /api/goals/duration: failed to count goals:', countError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if ((count ?? 0) >= cap) {
    return NextResponse.json(
      { error: `Goal cap reached. ${cap} goal${cap !== 1 ? 's' : ''} allowed at this level.` },
      { status: 422 }
    )
  }

  // Insert the new goal
  const { data: newGoal, error: insertError } = await supabase
    .from('duration_goals')
    .insert({
      user_id:   userId,
      pillar,
      goal_text: trimmedText,
      is_active: true,
    })
    .select('*')
    .single<DurationGoal>()

  if (insertError || !newGoal) {
    console.error('POST /api/goals/duration: failed to insert goal:', insertError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ goal: newGoal }, { status: 201 })
}

// ── DELETE — soft-delete a duration goal ─────────────────────────────────────

export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing goal id' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  // Verify ownership before soft-deleting
  const { data: existing, error: fetchError } = await supabase
    .from('duration_goals')
    .select('id, user_id')
    .eq('id', id)
    .single<Pick<DurationGoal, 'id' | 'user_id'>>()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  if (existing.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: updateError } = await supabase
    .from('duration_goals')
    .update({ is_active: false })
    .eq('id', id)

  if (updateError) {
    console.error('DELETE /api/goals/duration: failed to soft-delete goal:', updateError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
