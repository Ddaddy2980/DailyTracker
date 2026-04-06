'use server'

import { createServerSupabaseClient } from '@/lib/supabase'
import type { DurationGoalDestination } from '@/lib/types'

// Shape of one entry in weekly_reflections.destination_goal_statuses JSONB array.
// Written by saveWeeklyReflectionWithPulse in app/actions.ts.
interface DestinationGoalStatusEntry {
  destination_goal_id: string
  hits_this_week:      number
  frequency_target:    number
}

// Row shape returned from the weekly_reflections query — only the column we need.
interface ReflectionStatusRow {
  destination_goal_statuses: DestinationGoalStatusEntry[] | null
}

/**
 * Resolve any duration_goal_destinations rows that have passed their end_date
 * but are still status = 'active'.
 *
 * For each expired goal:
 *   - Aggregate total hits_this_week from weekly_reflections.destination_goal_statuses
 *   - Compare against total possible hits (frequency_target × weeks_in_window)
 *   - If hits >= 75% of possible → 'completed', otherwise → 'expired'
 *
 * Fire-and-forget safe: errors are logged but never thrown.
 */
export async function resolveExpiredDestinationGoals(
  userId:      string,
  challengeId: string,
): Promise<void> {
  const sb    = createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]  // YYYY-MM-DD

  // 1. Find all active goals whose end_date is before today
  const { data: expiredGoals, error: goalsError } = await sb
    .from('duration_goal_destinations')
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .eq('status', 'active')
    .lt('end_date', today)

  if (goalsError) {
    console.error('resolveExpiredDestinationGoals: failed to fetch expired goals', goalsError)
    return
  }
  if (!expiredGoals || expiredGoals.length === 0) return

  // 2. Pull all weekly reflections that have destination_goal_statuses data
  const { data: reflections, error: reflectionsError } = await sb
    .from('weekly_reflections')
    .select('destination_goal_statuses')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .not('destination_goal_statuses', 'is', null)

  if (reflectionsError) {
    console.error('resolveExpiredDestinationGoals: failed to fetch reflections', reflectionsError)
    return
  }

  const rows = (reflections ?? []) as ReflectionStatusRow[]
  const now  = new Date().toISOString()

  // 3. Evaluate and update each expired goal
  for (const goal of expiredGoals as DurationGoalDestination[]) {
    let totalHits = 0

    for (const row of rows) {
      const statuses = row.destination_goal_statuses
      if (!statuses) continue
      const entry = statuses.find(s => s.destination_goal_id === goal.id)
      if (entry) totalHits += entry.hits_this_week
    }

    const weeksInWindow  = Math.ceil(goal.window_days / 7)
    const totalPossible  = goal.frequency_target * weeksInWindow
    const newStatus      = totalHits >= totalPossible * 0.75 ? 'completed' : 'expired'

    const { error: updateError } = await sb
      .from('duration_goal_destinations')
      .update({ status: newStatus, updated_at: now })
      .eq('id', goal.id)
      .eq('user_id', userId)  // guard: never touch another user's row

    if (updateError) {
      console.error(
        `resolveExpiredDestinationGoals: failed to update goal ${goal.id}`,
        updateError,
      )
      // Continue processing remaining goals
    }
  }
}
