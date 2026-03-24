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
import type { UserProfile } from '@/lib/types'

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
