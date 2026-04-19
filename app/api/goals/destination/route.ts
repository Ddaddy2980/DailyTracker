import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { PILLAR_ORDER, DESTINATION_GOAL_CAP, destinationGoalsAvailable, todayStr } from '@/lib/constants'
import type { PillarLevel, DestinationGoal, LevelNumber, DestinationGoalStatus } from '@/lib/types'

const VALID_PILLARS = new Set<string>(PILLAR_ORDER)
const RELEASABLE_STATUSES = new Set<DestinationGoalStatus>(['completed', 'released'])

// ── POST — add a new destination goal ────────────────────────────────────────

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (
    typeof body !== 'object' || body === null ||
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

  // Fetch level to gate availability and check cap
  const { data: pillarLevel, error: levelError } = await supabase
    .from('pillar_levels')
    .select('level')
    .eq('user_id', userId)
    .eq('pillar', pillar)
    .single<Pick<PillarLevel, 'level'>>()

  if (levelError || !pillarLevel) {
    console.error('POST /api/goals/destination: failed to fetch pillar level:', levelError)
    return NextResponse.json({ error: 'Could not verify level' }, { status: 500 })
  }

  const level = pillarLevel.level as LevelNumber

  if (!destinationGoalsAvailable(level)) {
    return NextResponse.json(
      { error: 'Destination goals are not available at this level.' },
      { status: 422 }
    )
  }

  // Count existing active goals (only needed when cap is finite)
  const cap = DESTINATION_GOAL_CAP[level]
  if (cap !== null) {
    const { count, error: countError } = await supabase
      .from('destination_goals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('pillar', pillar)
      .eq('status', 'active')

    if (countError) {
      console.error('POST /api/goals/destination: failed to count goals:', countError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if ((count ?? 0) >= cap) {
      return NextResponse.json(
        { error: `Goal cap reached. ${cap} destination goal${cap !== 1 ? 's' : ''} allowed at this level.` },
        { status: 422 }
      )
    }
  }

  const { data: newGoal, error: insertError } = await supabase
    .from('destination_goals')
    .insert({
      user_id:          userId,
      pillar,
      goal_text:        trimmedText,
      status:           'active',
      start_date:       todayStr(),
      frequency_target: null,
      time_window_days: null,
    })
    .select('*')
    .single<DestinationGoal>()

  if (insertError || !newGoal) {
    console.error('POST /api/goals/destination: failed to insert goal:', insertError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ goal: newGoal }, { status: 201 })
}

// ── PATCH — complete or release a destination goal ────────────────────────────
// Body: { id: string, status: 'completed' | 'released' }

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (
    typeof body !== 'object' || body === null ||
    typeof (body as Record<string, unknown>).id !== 'string' ||
    typeof (body as Record<string, unknown>).status !== 'string' ||
    !RELEASABLE_STATUSES.has((body as Record<string, unknown>).status as DestinationGoalStatus)
  ) {
    return NextResponse.json(
      { error: 'Body must include id and status ("completed" or "released")' },
      { status: 400 }
    )
  }

  const { id, status } = body as { id: string; status: DestinationGoalStatus }

  const supabase = createServerSupabaseClient()

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('destination_goals')
    .select('id, user_id')
    .eq('id', id)
    .single<Pick<DestinationGoal, 'id' | 'user_id'>>()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  if (existing.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updates: Partial<DestinationGoal> = { status }
  if (status === 'completed') {
    updates.end_date = todayStr()
  }

  const { error: updateError } = await supabase
    .from('destination_goals')
    .update(updates)
    .eq('id', id)

  if (updateError) {
    console.error('PATCH /api/goals/destination: failed to update goal:', updateError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
