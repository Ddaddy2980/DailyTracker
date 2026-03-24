'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase'
import {
  defaultGoals,
  todayStr,
  type UserConfig,
  type UserGoals,
  type DailyEntry,
  type PillarGoal,
} from '@/lib/constants'
import type { UserProfile, Challenge, ChallengeEntry, Reward, RewardType } from '@/lib/types'

// Merge stored pillar goals with defaults so every expected ID is always present.
// Guards against empty arrays (migration default) or goals added after initial setup.
function mergePillarGoals(stored: PillarGoal[] | null | undefined, defaults: PillarGoal[]): PillarGoal[] {
  if (!stored || !Array.isArray(stored) || stored.length === 0) return defaults
  return defaults.map(def => {
    const saved = stored.find((g: PillarGoal) => g.id === def.id)
    return saved ? { ...def, ...saved } : def   // spread def first so new fields get defaults
  })
}

// ─── User profile (v2) ────────────────────────────────────────────────────────

export async function getUserProfile(): Promise<UserProfile | null> {
  const { userId } = await auth()
  if (!userId) return null

  const sb = createServerSupabaseClient()

  // Try to fetch existing profile
  const { data: existing, error: fetchError } = await sb
    .from('user_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) {
    console.error('getUserProfile fetch:', fetchError)
    return null
  }

  if (existing) return existing as UserProfile

  // No profile found — create one with Level 1 defaults
  const { data: created, error: insertError } = await sb
    .from('user_profile')
    .insert({
      user_id:              userId,
      current_level:        1,
      onboarding_completed: false,
      selected_pillars:     [],
    })
    .select()
    .single()

  if (insertError) {
    console.error('getUserProfile insert:', insertError)
    return null
  }

  return created as UserProfile
}

// ─── Challenge (v2) ───────────────────────────────────────────────────────────

// Maps pillar name to the daily_entries column that stores its completion state
const PILLAR_COL: Record<string, string> = {
  spiritual:   'spiritual',
  physical:    'physical_goals',
  nutritional: 'nutritional',
  personal:    'personal',
}

export async function getActiveChallenge(): Promise<Challenge | null> {
  const { userId } = await auth()
  if (!userId) return null

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('challenges')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) { console.error('getActiveChallenge:', error); return null }
  return data as Challenge | null
}

export async function getChallengeEntries(
  startDate: string,
  endDate:   string,
): Promise<ChallengeEntry[]> {
  const { userId } = await auth()
  if (!userId) return []

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('daily_entries')
    .select('entry_date, spiritual, physical_goals, nutritional, personal')
    .eq('user_id', userId)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .order('entry_date', { ascending: true })

  if (error) { console.error('getChallengeEntries:', error); return [] }
  return (data ?? []).map(row => ({
    entry_date:    row.entry_date,
    spiritual:     (row.spiritual      ?? {}) as Record<string, unknown>,
    physical_goals:(row.physical_goals ?? {}) as Record<string, unknown>,
    nutritional:   (row.nutritional    ?? {}) as Record<string, unknown>,
    personal:      (row.personal       ?? {}) as Record<string, unknown>,
  }))
}

// Maps milestone day numbers to reward types earned on that day
const DAY_REWARDS: Partial<Record<number, RewardType[]>> = {
  1: ['day1_complete'],
  3: ['day3_survival'],
  4: ['halfway'],
  7: ['day7_complete', 'starter_badge'],
}

export async function submitCheckin(data: {
  date:        string
  challengeId: string
  startDate:   string
  endDate:     string
  completions: Record<string, boolean>   // pillarName → complete
  dayNumber:   number
}): Promise<{ newRewards: RewardType[] }> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()

  // Build the upsert payload — one key per selected pillar
  const payload: Record<string, unknown> = {
    user_id:    userId,
    entry_date: data.date,
    updated_at: new Date().toISOString(),
  }
  for (const [pillar, complete] of Object.entries(data.completions)) {
    const col = PILLAR_COL[pillar]
    if (col) payload[col] = { challenge_complete: complete }
  }

  const { error: entryErr } = await sb
    .from('daily_entries')
    .upsert(payload, { onConflict: 'user_id,entry_date' })
  if (entryErr) throw new Error(`submitCheckin entry: ${entryErr.message}`)

  // Recalculate days_completed from actual entries (idempotent)
  const { data: allEntries } = await sb
    .from('daily_entries')
    .select('entry_date, spiritual, physical_goals, nutritional, personal')
    .eq('user_id', userId)
    .gte('entry_date', data.startDate)
    .lte('entry_date', data.endDate)

  const pillars = Object.keys(data.completions)
  const completeDays = (allEntries ?? []).filter(entry =>
    pillars.every(p => {
      const col = PILLAR_COL[p]
      const val = col ? (entry[col as keyof typeof entry] as Record<string, unknown> | null) : null
      return val?.challenge_complete === true
    })
  ).length

  await sb.from('challenges').update({
    days_completed:  completeDays,
    consistency_pct: Math.round((completeDays / 7) * 100),
    updated_at:      new Date().toISOString(),
  }).eq('id', data.challengeId)

  // ── Award milestone rewards ────────────────────────────────────────────────
  // Only award if every pillar was completed on this save.
  const allComplete = pillars.every(p => data.completions[p])
  const candidateRewards = allComplete ? (DAY_REWARDS[data.dayNumber] ?? []) : []
  const newRewards: RewardType[] = []

  if (candidateRewards.length > 0) {
    // Fetch rewards already earned so we know which ones are truly new
    const { data: existing } = await sb
      .from('rewards')
      .select('reward_type')
      .eq('user_id', userId)

    const alreadyEarned = new Set((existing ?? []).map(r => r.reward_type as RewardType))

    for (const rt of candidateRewards) {
      if (alreadyEarned.has(rt)) continue   // already awarded — skip
      const { error: rewardErr } = await sb.from('rewards').insert({
        user_id:      userId,
        reward_type:  rt,
        challenge_id: data.challengeId,
        earned_at:    new Date().toISOString(),
      })
      if (!rewardErr) newRewards.push(rt)
    }
  }

  revalidatePath('/challenge')
  return { newRewards }
}

// ─── Earned rewards (v2) ──────────────────────────────────────────────────────

export async function getEarnedRewards(challengeId: string): Promise<Reward[]> {
  const { userId } = await auth()
  if (!userId) return []

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('rewards')
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .order('earned_at', { ascending: true })

  if (error) { console.error('getEarnedRewards:', error); return [] }
  return (data ?? []) as Reward[]
}

// ─── Onboarding (v2) ──────────────────────────────────────────────────────────

export async function completeOnboarding(data: {
  purposeStatement: string
  selectedPillars: string[]
  goals: Record<string, string>
}): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb    = createServerSupabaseClient()
  const start = todayStr()

  // End date = start + 6 days (7-day challenge, inclusive)
  const startDt = new Date(start + 'T00:00:00')
  startDt.setDate(startDt.getDate() + 6)
  const end = new Intl.DateTimeFormat('en-CA').format(startDt)

  // 1. Update user_profile
  const { error: profileErr } = await sb
    .from('user_profile')
    .update({
      purpose_statement:    data.purposeStatement || null,
      selected_pillars:     data.selectedPillars,
      onboarding_completed: true,
      updated_at:           new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (profileErr) throw new Error(`completeOnboarding profile: ${profileErr.message}`)

  // 2. Create the Level 1 challenge row
  const { error: challengeErr } = await sb
    .from('challenges')
    .insert({
      user_id:      userId,
      level:        1,
      duration_days: 7,
      start_date:   start,
      end_date:     end,
      status:       'active',
      pillar_goals: data.goals,
    })

  if (challengeErr) throw new Error(`completeOnboarding challenge: ${challengeErr.message}`)

  revalidatePath('/')
}

// ─── Video progress (v2) ──────────────────────────────────────────────────────

export async function getWatchedVideoIds(): Promise<string[]> {
  const { userId } = await auth()
  if (!userId) return []

  const sb = createServerSupabaseClient()
  const { data, error } = await sb
    .from('video_progress')
    .select('video_id')
    .eq('user_id', userId)

  if (error) { console.error('getWatchedVideoIds:', error); return [] }
  return (data ?? []).map(row => row.video_id as string)
}

export async function markVideoWatched(videoId: string, triggeredBy: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  const { error } = await sb
    .from('video_progress')
    .upsert(
      { user_id: userId, video_id: videoId, triggered_by: triggeredBy, watched_at: new Date().toISOString() },
      { onConflict: 'user_id,video_id' }
    )

  if (error) throw new Error(`markVideoWatched: ${error.message}`)
  revalidatePath('/challenge')
}

// ─── Config ───────────────────────────────────────────────────────────────────

export async function getUserConfig(): Promise<UserConfig | null> {
  const { userId } = await auth()
  if (!userId) return null

  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('user_config')
    .select('name, start_date, duration')
    .eq('user_id', userId)
    .maybeSingle()

  return data ?? null
}

export async function saveUserConfig(config: UserConfig) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  const { error } = await sb.from('user_config').upsert(
    { user_id: userId, ...config, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(`saveUserConfig: ${error.message}`)
  revalidatePath('/')
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function getUserGoals(): Promise<UserGoals> {
  const { userId } = await auth()
  if (!userId) return defaultGoals()

  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('user_goals')
    .select('spiritual, physical, exercise_types, stretching_types, nutritional, personal')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return defaultGoals()

  const defs = defaultGoals()
  return {
    spiritual:       mergePillarGoals(data.spiritual, defs.spiritual),
    physical:        mergePillarGoals(data.physical,  defs.physical),
    exerciseTypes:   data.exercise_types   ?? [],
    stretchingTypes: data.stretching_types ?? [],
    nutritional:     data.nutritional      ?? [],
    personal:        mergePillarGoals(data.personal,  defs.personal),
  }
}

export async function saveUserGoals(goals: UserGoals) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  const { error } = await sb.from('user_goals').upsert(
    {
      user_id:          userId,
      spiritual:        goals.spiritual,
      physical:         goals.physical,
      exercise_types:   goals.exerciseTypes,
      stretching_types: goals.stretchingTypes,
      nutritional:      goals.nutritional,
      personal:         goals.personal,
      updated_at:       new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(`saveUserGoals: ${error.message}`)
  revalidatePath('/dashboard')
}

// ─── Daily entries ────────────────────────────────────────────────────────────

export async function getEntry(date?: string): Promise<DailyEntry | null> {
  const { userId } = await auth()
  if (!userId) return null

  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('daily_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_date', date ?? todayStr())
    .maybeSingle()

  if (!data) return null

  return {
    entry_date:        data.entry_date,
    spiritual:         data.spiritual         ?? {},
    physical_goals:    data.physical_goals    ?? {},
    activities:        data.activities        ?? [],
    sleep:             data.sleep             ?? null,
    weight:            data.weight            ?? null,
    blood_pressure:    data.blood_pressure    ?? null,
    nutritional:       data.nutritional       ?? {},
    nutritional_log:   data.nutritional_log   ?? {},
    personal:          data.personal          ?? {},
    tiered_selections: data.tiered_selections ?? {},
  }
}

export async function saveEntry(entry: DailyEntry) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  const { error } = await sb.from('daily_entries').upsert(
    {
      user_id:         userId,
      entry_date:      entry.entry_date,
      spiritual:       entry.spiritual,
      physical_goals:  entry.physical_goals,
      activities:      entry.activities,
      sleep:           entry.sleep,
      weight:          entry.weight,
      blood_pressure:  entry.blood_pressure,
      nutritional:       entry.nutritional,
      nutritional_log:   entry.nutritional_log   ?? {},
      personal:          entry.personal,
      tiered_selections: entry.tiered_selections ?? {},
      updated_at:      new Date().toISOString(),
    },
    { onConflict: 'user_id,entry_date' }
  )
  if (error) throw new Error(`saveEntry: ${error.message}`)
  revalidatePath('/dashboard')
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getHistory(limit = 90): Promise<DailyEntry[]> {
  const { userId } = await auth()
  if (!userId) return []

  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('daily_entries')
    .select('*')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .limit(limit)

  return (data ?? []).map(row => ({
    entry_date:        row.entry_date,
    spiritual:         row.spiritual         ?? {},
    physical_goals:    row.physical_goals    ?? {},
    activities:        row.activities        ?? [],
    sleep:             row.sleep             ?? null,
    weight:            row.weight            ?? null,
    blood_pressure:    row.blood_pressure    ?? null,
    nutritional:       row.nutritional       ?? {},
    nutritional_log:   row.nutritional_log   ?? {},
    personal:          row.personal          ?? {},
    tiered_selections: row.tiered_selections ?? {},
    updated_at:        row.updated_at        ?? undefined,
  }))
}

// ─── Weekly notes ─────────────────────────────────────────────────────────────

export async function getWeeklyNote(weekStart: string): Promise<string> {
  const { userId } = await auth()
  if (!userId) return ''

  const sb = createServerSupabaseClient()
  const { data } = await sb
    .from('weekly_notes')
    .select('notes')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle()

  return data?.notes ?? ''
}

export async function saveWeeklyNote(weekStart: string, notes: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const sb = createServerSupabaseClient()
  const { error } = await sb.from('weekly_notes').upsert(
    { user_id: userId, week_start: weekStart, notes, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,week_start' }
  )
  if (error) throw new Error(`saveWeeklyNote: ${error.message}`)
}

// ─── Setup: save config + goals together ─────────────────────────────────────

export async function finishSetup(config: UserConfig, goals: UserGoals) {
  await saveUserConfig(config)
  await saveUserGoals(goals)
  revalidatePath('/')
}
