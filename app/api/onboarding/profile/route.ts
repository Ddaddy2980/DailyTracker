import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { scoreToLevel, PILLAR_ORDER } from '@/lib/constants'
import type { PillarName, LevelNumber } from '@/lib/types'

type ScoresBody = Record<PillarName, number>

function isValidScores(v: unknown): v is ScoresBody {
  if (typeof v !== 'object' || v === null) return false
  for (const pillar of PILLAR_ORDER) {
    const score = (v as Record<string, unknown>)[pillar]
    if (typeof score !== 'number' || score < 0 || score > 12) return false
  }
  return true
}

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
    !('scores' in body) ||
    !isValidScores((body as { scores: unknown }).scores)
  ) {
    return NextResponse.json(
      { error: 'scores must be an object with each pillar scored 0–12' },
      { status: 400 }
    )
  }

  const scores = (body as { scores: ScoresBody }).scores
  const supabase = createServerSupabaseClient()

  // Insert consistency profile session
  const { error: sessionError } = await supabase
    .from('consistency_profile_sessions')
    .insert({
      user_id:           userId,
      spiritual_score:   scores.spiritual,
      physical_score:    scores.physical,
      nutritional_score: scores.nutritional,
      personal_score:    scores.personal,
      relational_score:  scores.relational,
      is_reassessment:   false,
    })

  if (sessionError) {
    console.error('Failed to insert consistency_profile_sessions:', sessionError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Upsert one pillar_levels row per pillar
  const pillarRows = PILLAR_ORDER.map((pillar) => ({
    user_id:       userId,
    pillar,
    level:         scoreToLevel(scores[pillar]),
    is_active:     false,
    profile_score: scores[pillar],
  }))

  const { error: pillarError } = await supabase
    .from('pillar_levels')
    .upsert(pillarRows, { onConflict: 'user_id,pillar' })

  if (pillarError) {
    console.error('Failed to upsert pillar_levels:', pillarError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Mark consistency_profile_completed
  const { error: profileError } = await supabase
    .from('user_profile')
    .update({ consistency_profile_completed: true })
    .eq('user_id', userId)

  if (profileError) {
    console.error('Failed to update user_profile:', profileError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Build levels response
  const levels = PILLAR_ORDER.reduce<Record<PillarName, LevelNumber>>(
    (acc, pillar) => {
      acc[pillar] = scoreToLevel(scores[pillar])
      return acc
    },
    {} as Record<PillarName, LevelNumber>
  )

  return NextResponse.json({ success: true, levels })
}
