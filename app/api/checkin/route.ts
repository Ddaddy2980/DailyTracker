import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { PILLAR_ORDER, todayStr } from '@/lib/constants'
import type { DurationGoal, GoalCompletions } from '@/lib/types'

interface CheckinRequestBody {
  pillar: unknown
  challengeId: unknown
  goalCompletions: unknown
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CheckinRequestBody
  try {
    body = (await request.json()) as CheckinRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { pillar, challengeId, goalCompletions } = body

  // Validate pillar
  if (typeof pillar !== 'string' || !PILLAR_ORDER.includes(pillar as (typeof PILLAR_ORDER)[number])) {
    return NextResponse.json({ error: 'Invalid pillar' }, { status: 400 })
  }

  // Validate challengeId
  if (typeof challengeId !== 'string' || challengeId.trim() === '') {
    return NextResponse.json({ error: 'Invalid challengeId' }, { status: 400 })
  }

  // Validate goalCompletions is a Record<string, boolean>
  if (
    typeof goalCompletions !== 'object' ||
    goalCompletions === null ||
    Array.isArray(goalCompletions)
  ) {
    return NextResponse.json({ error: 'Invalid goalCompletions' }, { status: 400 })
  }

  for (const [key, val] of Object.entries(goalCompletions)) {
    if (typeof key !== 'string' || typeof val !== 'boolean') {
      return NextResponse.json({ error: 'Invalid goalCompletions shape' }, { status: 400 })
    }
  }

  const typedGoalCompletions = goalCompletions as GoalCompletions

  const supabase = createServerSupabaseClient()

  // Fetch active duration goals for this user+pillar to determine `completed`
  const { data: activeGoals, error: goalsError } = await supabase
    .from('duration_goals')
    .select('id')
    .eq('user_id', userId)
    .eq('pillar', pillar)
    .eq('is_active', true)
    .returns<Pick<DurationGoal, 'id'>[]>()

  if (goalsError) {
    console.error('checkin: failed to load active duration_goals:', goalsError)
    return NextResponse.json({ error: 'Failed to load goals' }, { status: 500 })
  }

  const goals = activeGoals ?? []

  // completed = true only when every active goal is checked
  const completed =
    goals.length > 0 &&
    goals.every((g) => typedGoalCompletions[g.id] === true)

  const { error: upsertError } = await supabase
    .from('pillar_daily_entries')
    .upsert(
      {
        user_id:          userId,
        challenge_id:     challengeId,
        pillar,
        entry_date:       todayStr(),
        completed,
        goal_completions: typedGoalCompletions,
      },
      { onConflict: 'user_id,pillar,entry_date' }
    )

  if (upsertError) {
    console.error('checkin: failed to upsert pillar_daily_entry:', upsertError)
    return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 })
  }

  return NextResponse.json({ success: true, completed })
}
