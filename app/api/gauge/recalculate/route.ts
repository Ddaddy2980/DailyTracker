import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import {
  calcAllPillarGauges,
  calcLifeOnPurposeScore,
  type GaugeEntryRow,
} from '@/lib/gauge-engine'
import type { PillarName, PillarLevel } from '@/lib/types'

// Called by Vercel Cron every Sunday at 00:00 UTC.
// Recalculates gauge_score for every active pillar for every user with an
// active challenge, then updates life_on_purpose_score on user_profile.
//
// Also callable on-demand in dev — same CRON_SECRET auth as the notification cron.

const ALL_PILLARS: PillarName[] = ['spiritual', 'physical', 'nutritional', 'personal', 'missional']

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

// Returns today's date string in YYYY-MM-DD (UTC)
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb    = createServerSupabaseClient()
  const today = todayUTC()

  // ── 1. Fetch all active challenges ──────────────────────────────────────────
  // We need user_id, challenge start_date, and the active pillar set.
  // pillar_goals keys tell us which pillars are active in this challenge.
  const { data: challenges, error: challengeErr } = await sb
    .from('challenges')
    .select('id, user_id, start_date, pillar_goals')
    .eq('status', 'active')

  if (challengeErr) {
    console.error('[gauge/recalculate] fetch challenges:', challengeErr)
    return NextResponse.json({ error: 'DB error fetching challenges' }, { status: 500 })
  }

  if (!challenges || challenges.length === 0) {
    return NextResponse.json({ updated: 0, message: 'No active challenges' })
  }

  // ── 2. Collect unique user IDs ───────────────────────────────────────────────
  const userIds = [...new Set(challenges.map(c => c.user_id as string))]

  // ── 3. Fetch all pillar_levels rows for these users ──────────────────────────
  // We need these to know which pillars have rows (i.e. are not dormant).
  const { data: pillarLevelRows, error: plErr } = await sb
    .from('pillar_levels')
    .select('id, user_id, pillar, gauge_score')
    .in('user_id', userIds)

  if (plErr) {
    console.error('[gauge/recalculate] fetch pillar_levels:', plErr)
    return NextResponse.json({ error: 'DB error fetching pillar_levels' }, { status: 500 })
  }

  // Build a lookup: userId → PillarLevel rows
  const pillarLevelMap = new Map<string, Array<Pick<PillarLevel, 'id' | 'pillar' | 'gauge_score'>>>()
  for (const row of (pillarLevelRows ?? [])) {
    const uid = row.user_id as string
    if (!pillarLevelMap.has(uid)) pillarLevelMap.set(uid, [])
    pillarLevelMap.get(uid)!.push({
      id:          row.id as string,
      pillar:      row.pillar as PillarName,
      gauge_score: row.gauge_score as number | null,
    })
  }

  // ── 4. Process each challenge ────────────────────────────────────────────────
  // Group challenges by user_id — if a user somehow has multiple active challenges
  // (shouldn't happen, but be safe) take the most recently created one.
  // The challenges query doesn't include created_at here, so we process all and
  // let upsert overwrite — last write wins per (user_id, pillar).

  let pillarUpdates = 0
  let userUpdates   = 0

  for (const challenge of challenges) {
    const userId       = challenge.user_id as string
    const startDate    = challenge.start_date as string
    const pillarGoals  = (challenge.pillar_goals ?? {}) as Record<string, unknown>

    // Active pillars for this challenge = keys of pillar_goals that are also
    // known pillars (guards against stale/unknown keys).
    const activePillars = Object.keys(pillarGoals).filter(
      (k): k is PillarName => (ALL_PILLARS as string[]).includes(k)
    )

    if (activePillars.length === 0) continue

    // ── 4a. Fetch daily_entries from challenge start to today ─────────────────
    const { data: entryRows, error: entryErr } = await sb
      .from('daily_entries')
      .select('entry_date, spiritual, physical_goals, nutritional, personal, missional')
      .eq('user_id', userId)
      .gte('entry_date', startDate)
      .lte('entry_date', today)
      .order('entry_date', { ascending: true })

    if (entryErr) {
      console.error(`[gauge/recalculate] fetch entries for ${userId}:`, entryErr)
      continue   // skip this user — don't block the rest
    }

    const entries = (entryRows ?? []) as GaugeEntryRow[]

    // ── 4b. Run gauge engine ──────────────────────────────────────────────────
    const results = calcAllPillarGauges(entries, activePillars, startDate, today)

    // ── 4c. Persist gauge_score to pillar_levels ──────────────────────────────
    // Update only rows that exist (pillar_levels was seeded in Step 33).
    // Do not upsert — if a row doesn't exist, something is wrong upstream.
    const userPillarRows = pillarLevelMap.get(userId) ?? []

    for (const result of results) {
      const plRow = userPillarRows.find(r => r.pillar === result.pillar)
      if (!plRow) continue  // no pillar_levels row = dormant, skip

      // Only write if the score has actually changed — avoids unnecessary DB writes
      if (plRow.gauge_score === result.gaugeScore) continue

      const { error: updateErr } = await sb
        .from('pillar_levels')
        .update({
          gauge_score: result.gaugeScore,
          updated_at:  new Date().toISOString(),
        })
        .eq('id', plRow.id)

      if (updateErr) {
        console.error(`[gauge/recalculate] update pillar_levels ${plRow.id}:`, updateErr)
      } else {
        pillarUpdates++
      }
    }

    // ── 4d. Calculate and persist life_on_purpose_score ───────────────────────
    // Re-read the updated gauge scores from our in-memory results map so we don't
    // need another round-trip.  Fill in pillars not in this challenge as null.
    const gaugeScoreMap: Record<PillarName, number | null> = {
      spiritual:   null,
      physical:    null,
      nutritional: null,
      personal:    null,
      missional:   null,
    }
    for (const result of results) {
      gaugeScoreMap[result.pillar] = result.gaugeScore
    }
    // For pillars that have an existing pillar_levels row but aren't in this challenge,
    // use their current persisted gauge_score (they may have data from a prior challenge).
    for (const plRow of userPillarRows) {
      const pillar = plRow.pillar as PillarName
      if (gaugeScoreMap[pillar] === null && plRow.gauge_score !== null) {
        gaugeScoreMap[pillar] = plRow.gauge_score
      }
    }

    const lifeScore = calcLifeOnPurposeScore(gaugeScoreMap)

    const { error: profileErr } = await sb
      .from('user_profile')
      .update({
        life_on_purpose_score: lifeScore,
        updated_at:            new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (profileErr) {
      console.error(`[gauge/recalculate] update user_profile ${userId}:`, profileErr)
    } else {
      userUpdates++
    }
  }

  console.log(`[gauge/recalculate] done. pillarUpdates=${pillarUpdates} userUpdates=${userUpdates}`)
  return NextResponse.json({ pillarUpdates, userUpdates })
}
