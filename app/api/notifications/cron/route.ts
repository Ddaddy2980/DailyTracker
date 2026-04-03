import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { JAMMING_NOTIFICATIONS, GROOVING_NOTIFICATIONS, NOTIFICATION_CADENCE, GROUP_NOTIFICATIONS } from '@/lib/constants'
import { todayStr } from '@/lib/constants'
import { autoResumePausedChallenges } from '@/app/actions'
import { resolveMorningTone } from '@/lib/morning-tone'
import type { PillarLevel } from '@/lib/types'

// Called by Vercel Cron at:
//   7:00 AM  → time=morning
//   8:00 PM  → time=evening
//   9:45 PM  → time=late_rescue
//   Wednesday 12:00 PM → time=mid_week

// Protect with CRON_SECRET env var — set in Vercel project settings
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

type NotificationTime = 'morning' | 'evening' | 'late_rescue' | 'mid_week'

const TIME_NOTIFICATION: Record<NotificationTime, string> = {
  morning:     'morning_anchor',
  evening:     'evening_checkin',
  late_rescue: 'late_rescue',
  mid_week:    'mid_week_encouragement',
}

// Which tiers receive each notification time
const TIME_TIERS: Record<NotificationTime, string[]> = {
  morning:     ['minimal', 'standard', 'full'],
  evening:     ['standard', 'full'],
  late_rescue: ['full'],
  mid_week:    ['standard', 'full'],
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const time = searchParams.get('time') as NotificationTime | null

  if (!time || !(time in TIME_NOTIFICATION)) {
    return NextResponse.json({ error: 'Missing or invalid ?time param' }, { status: 400 })
  }

  const sb    = createServerSupabaseClient()
  const today = todayStr()
  const eligibleTiers = TIME_TIERS[time]

  // Fetch all active Level 2 challenges with their user profiles
  const { data: challenges, error } = await sb
    .from('challenges')
    .select(`
      id,
      user_id,
      start_date,
      duration_days,
      days_completed
    `)
    .eq('status', 'active')
    .eq('level', 2)

  if (error) {
    console.error('notifications/cron fetch challenges:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!challenges || challenges.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const userIds = challenges.map(c => c.user_id as string)

  // Fetch profiles for all relevant users
  const { data: profiles } = await sb
    .from('user_profile')
    .select('user_id, notification_tier, selected_pillars')
    .in('user_id', userIds)

  const profileMap = new Map(
    (profiles ?? []).map(p => [p.user_id as string, p])
  )

  // Fetch today's entries to exclude already-checked-in users (for evening/late)
  const needsCheckinFilter = time === 'evening' || time === 'late_rescue'
  let checkedInToday = new Set<string>()

  if (needsCheckinFilter) {
    const { data: todayEntries } = await sb
      .from('daily_entries')
      .select('user_id')
      .in('user_id', userIds)
      .eq('entry_date', today)

    checkedInToday = new Set((todayEntries ?? []).map(e => e.user_id as string))
  }

  let sent = 0
  const notifications: { userId: string; message: string }[] = []

  for (const challenge of challenges) {
    const userId  = challenge.user_id as string
    const profile = profileMap.get(userId)
    if (!profile) continue

    const tier = profile.notification_tier as string
    if (!eligibleTiers.includes(tier)) continue

    // Skip already-checked-in users for evening/late
    if (needsCheckinFilter && checkedInToday.has(userId)) continue

    // Build notification message
    const startMs   = new Date((challenge.start_date as string) + 'T00:00:00').getTime()
    const todayMs   = new Date(today + 'T00:00:00').getTime()
    const dayNumber = Math.max(Math.floor((todayMs - startMs) / 86_400_000) + 1, 1)
    const weekNumber = Math.ceil(dayNumber / 7)
    const pillars   = (profile.selected_pillars as string[]) ?? []

    let message: string
    switch (time) {
      case 'morning':
        message = JAMMING_NOTIFICATIONS.morning_anchor({ dayNumber, pillars })
        break
      case 'evening':
        message = JAMMING_NOTIFICATIONS.evening_checkin({ pillars })
        break
      case 'late_rescue':
        message = JAMMING_NOTIFICATIONS.late_rescue()
        break
      case 'mid_week':
        message = JAMMING_NOTIFICATIONS.mid_week_encouragement({ dayNumber })
        break
      default:
        continue
    }

    // TODO: deliver via push/email — integrate your delivery provider here
    // e.g. await sendPushNotification(userId, message)
    // e.g. await sendEmail(userId, { subject: 'Daily check-in reminder', body: message })

    notifications.push({ userId, message })
    sent++
    void weekNumber // referenced in weekly pulse prompt — used by pulse cron separately
  }

  // ── Evening group nudge (Step 16g) ──────────────────────────────────────────
  // After the standard per-challenge loop, add a group nudge for users who:
  //   1. Have not checked in today
  //   2. Did NOT already receive a standard evening reminder this run (de-duplication)
  //   3. Have at least one group member who HAS checked in today ('full' or 'partial')
  //
  // One evening notification per user per run maximum — this nudge is skipped
  // for any userId already in the notifications array.
  if (time === 'evening') {
    const alreadyNotifiedIds = new Set(notifications.map(n => n.userId))

    // Users eligible for nudge: active challenge, not checked in, not already notified
    const nudgeCandidates = challenges
      .map(c => c.user_id as string)
      .filter(uid => !checkedInToday.has(uid) && !alreadyNotifiedIds.has(uid))

    if (nudgeCandidates.length > 0) {
      // Fetch their active group memberships
      const { data: memberRows } = await sb
        .from('group_members')
        .select('user_id, group_id')
        .in('user_id', nudgeCandidates)
        .eq('active', true)

      if (memberRows && memberRows.length > 0) {
        const allGroupIds = [...new Set(memberRows.map(r => r.group_id as string))]

        // Fetch today's check-in status for all these groups (only engaged rows)
        const [statusRes, groupRes] = await Promise.all([
          sb
            .from('group_daily_status')
            .select('group_id, user_id, completion_status')
            .in('group_id', allGroupIds)
            .eq('status_date', today)
            .in('completion_status', ['full', 'partial']),
          sb
            .from('consistency_groups')
            .select('id, name')
            .in('id', allGroupIds)
            .eq('status', 'active'),
        ])

        const groupNameMap = new Map(
          (groupRes.data ?? []).map(g => [g.id as string, g.name as string])
        )

        for (const userId of nudgeCandidates) {
          // Groups this user belongs to
          const userGroupIds = memberRows
            .filter(r => r.user_id === userId)
            .map(r => r.group_id as string)

          // Find the first group where another member has checked in
          let nudged = false
          for (const groupId of userGroupIds) {
            const othersCheckedIn = (statusRes.data ?? []).filter(
              s => s.group_id === groupId && s.user_id !== userId
            )
            if (othersCheckedIn.length > 0) {
              const groupName = groupNameMap.get(groupId) ?? 'your group'
              const message   = GROUP_NOTIFICATIONS.evening_nudge({
                count:     othersCheckedIn.length,
                groupName,
              })
              notifications.push({ userId, message })
              sent++
              nudged = true
              break // one nudge per user per run
            }
          }
          void nudged // used for early-exit only
        }
      }
    }
  }

  // ── Grooving notifications (Step 29) ─────────────────────────────────────────
  // Handles all Level 3 notification types. Active (non-paused) and paused
  // challenges are processed separately; paused users receive ONLY the pause-day
  // message and are excluded from every other notification type.

  // ── Grooving morning block ────────────────────────────────────────────────────
  if (time === 'morning') {
    // Active (non-paused) Grooving challenges
    const { data: grMorningChallenges } = await sb
      .from('challenges')
      .select('id, user_id, start_date, duration_days, pillar_goals')
      .eq('status', 'active')
      .eq('level', 3)
      .eq('is_paused', false)

    if (grMorningChallenges && grMorningChallenges.length > 0) {
      const grMorningUserIds = grMorningChallenges.map(c => c.user_id as string)

      const [{ data: grMorningProfiles }, { data: grPillarLevels }] = await Promise.all([
        sb.from('user_profile')
          .select('user_id, rooted_milestone_date, rooted_milestone_fired, rooted_goal_id, last_pattern_alert_at')
          .in('user_id', grMorningUserIds),
        sb.from('pillar_levels')
          .select('user_id, pillar, level, operating_state, gauge_score')
          .in('user_id', grMorningUserIds),
      ])
      const grMorningProfileMap = new Map(
        (grMorningProfiles ?? []).map(p => [p.user_id as string, p])
      )
      const grPillarLevelsMap = new Map<string, PillarLevel[]>()
      for (const row of (grPillarLevels ?? [])) {
        const uid = row.user_id as string
        if (!grPillarLevelsMap.has(uid)) grPillarLevelsMap.set(uid, [])
        grPillarLevelsMap.get(uid)!.push(row as PillarLevel)
      }

      // Fetch group_daily_status for last 21 days — used for pattern detection.
      // Only 'none' and 'partial' rows needed; de-dup by (user_id, status_date) in memory.
      const d21 = new Date(today + 'T00:00:00')
      d21.setDate(d21.getDate() - 21)
      const twentyOneDaysAgo = new Intl.DateTimeFormat('en-CA').format(d21)

      const { data: patternStatuses } = await sb
        .from('group_daily_status')
        .select('user_id, status_date, completion_status')
        .in('user_id', grMorningUserIds)
        .gte('status_date', twentyOneDaysAgo)
        .in('completion_status', ['none', 'partial'])

      // De-dup by (user_id, status_date): collect unique missed dates per user
      const grMissedDateMap = new Map<string, Set<string>>()
      for (const row of (patternStatuses ?? [])) {
        const uid  = row.user_id as string
        const date = row.status_date as string
        if (!grMissedDateMap.has(uid)) grMissedDateMap.set(uid, new Set())
        grMissedDateMap.get(uid)!.add(date)
      }

      const WEEKDAY_NAMES = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

      // Returns the weekday name where the last 3 occurrences within 21 days were
      // all 'none' or 'partial', or null if no such pattern exists.
      function detectWeekdayPattern(missedDates: Set<string>): string | null {
        const ref = new Date(today + 'T00:00:00')
        for (let wd = 0; wd < 7; wd++) {
          const occurrences: string[] = []
          for (let i = 1; i <= 21 && occurrences.length < 3; i++) {
            const d = new Date(ref)
            d.setDate(ref.getDate() - i)
            if (d.getDay() === wd) {
              occurrences.push(new Intl.DateTimeFormat('en-CA').format(d))
            }
          }
          if (occurrences.length === 3 && occurrences.every(dt => missedDates.has(dt))) {
            return WEEKDAY_NAMES[wd]
          }
        }
        return null
      }

      const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

      for (const challenge of grMorningChallenges) {
        const userId  = challenge.user_id as string
        const profile = grMorningProfileMap.get(userId)

        const startMs   = new Date((challenge.start_date as string) + 'T00:00:00').getTime()
        const todayMs   = new Date(today + 'T00:00:00').getTime()
        const dayNumber = Math.max(Math.floor((todayMs - startMs) / 86_400_000) + 1, 1)
        const durationDays = challenge.duration_days as number

        // Morning anchor — tone adapts to pillar operating states
        const userPillarLevels = grPillarLevelsMap.get(userId) ?? []
        const { tone, highestDevelopingLevel } = resolveMorningTone(userPillarLevels)
        let morningMessage: string
        switch (tone) {
          case 'motivational':
            morningMessage = GROOVING_NOTIFICATIONS.morning_anchor_motivational({ dayNumber, durationDays })
            break
          case 'coaching':
            morningMessage = GROOVING_NOTIFICATIONS.morning_anchor_coaching({ dayNumber, durationDays, highestLevel: highestDevelopingLevel ?? 3 })
            break
          case 'reflective':
            morningMessage = GROOVING_NOTIFICATIONS.morning_anchor_reflective()
            break
        }
        notifications.push({ userId, message: morningMessage })
        sent++

        if (!profile) continue

        // Rooted milestone push — fires only on the day the milestone was recorded
        if (
          profile.rooted_milestone_fired === true &&
          profile.rooted_milestone_date === today &&
          profile.rooted_goal_id
        ) {
          const pillarGoals  = (challenge.pillar_goals as Record<string, unknown>)
          const goalName     = String(pillarGoals[profile.rooted_goal_id as string] ?? profile.rooted_goal_id)
          notifications.push({ userId, message: GROOVING_NOTIFICATIONS.rooted_milestone({ goalName }) })
          sent++
        }

        // Pattern alert — only if a 3-week weekday pattern exists AND
        // the last alert was > 14 days ago (or never fired)
        const missedDates  = grMissedDateMap.get(userId) ?? new Set<string>()
        const patternDay   = detectWeekdayPattern(missedDates)
        if (patternDay) {
          const lastAlertAt  = profile.last_pattern_alert_at as string | null
          const alertAge     = lastAlertAt ? Date.now() - new Date(lastAlertAt).getTime() : Infinity
          if (alertAge > FOURTEEN_DAYS_MS) {
            notifications.push({ userId, message: GROOVING_NOTIFICATIONS.pattern_alert({ dayOfWeek: patternDay }) })
            sent++
            // Record alert time to suppress re-fire within 14 days
            await sb
              .from('user_profile')
              .update({ last_pattern_alert_at: new Date().toISOString() })
              .eq('user_id', userId)
          }
        }
      }
    }

    // Paused Grooving challenges — daily pause-day message replaces all other notifications
    const { data: grPausedChallenges } = await sb
      .from('challenges')
      .select('id, user_id')
      .eq('status', 'active')
      .eq('level', 3)
      .eq('is_paused', true)

    if (grPausedChallenges && grPausedChallenges.length > 0) {
      const pausedChallengeIds = grPausedChallenges.map(c => c.id as string)

      const { data: pauseRecords } = await sb
        .from('challenge_pauses')
        .select('challenge_id, paused_at')
        .in('challenge_id', pausedChallengeIds)
        .is('resumed_at', null)
      const pauseRecordMap = new Map(
        (pauseRecords ?? []).map(r => [r.challenge_id as string, r.paused_at as string])
      )

      for (const challenge of grPausedChallenges) {
        const pausedAt  = pauseRecordMap.get(challenge.id as string)
        const daysPaused = pausedAt
          ? Math.max(1, Math.min(14, Math.ceil((Date.now() - new Date(pausedAt).getTime()) / 86_400_000)))
          : 1
        notifications.push({
          userId:  challenge.user_id as string,
          message: GROOVING_NOTIFICATIONS.pause_daily({ daysPaused }),
        })
        sent++
      }
    }
  }

  // ── Grooving evening block ────────────────────────────────────────────────────
  if (time === 'evening') {
    const { data: grEveningChallenges } = await sb
      .from('challenges')
      .select('id, user_id, start_date')
      .eq('status', 'active')
      .eq('level', 3)
      .eq('is_paused', false)

    if (grEveningChallenges && grEveningChallenges.length > 0) {
      const grEveningUserIds    = grEveningChallenges.map(c => c.user_id as string)
      const grEveningChallengeIds = grEveningChallenges.map(c => c.id as string)

      // Profiles (tier + pulse state lookup)
      const { data: grEveningProfiles } = await sb
        .from('user_profile')
        .select('user_id, notification_tier')
        .in('user_id', grEveningUserIds)
      const grEveningProfileMap = new Map(
        (grEveningProfiles ?? []).map(p => [p.user_id as string, p])
      )

      // Who already checked in today
      const { data: grTodayEntries } = await sb
        .from('daily_entries')
        .select('user_id')
        .in('user_id', grEveningUserIds)
        .eq('entry_date', today)
      const grCheckedInToday = new Set((grTodayEntries ?? []).map(e => e.user_id as string))

      // Most recent pulse state per user
      const { data: grPulseChecks } = await sb
        .from('pulse_checks')
        .select('user_id, pulse_state, recorded_at')
        .in('user_id', grEveningUserIds)
        .order('recorded_at', { ascending: false })
      const grLastPulseMap = new Map<string, string>()
      for (const pc of (grPulseChecks ?? [])) {
        const uid = pc.user_id as string
        if (!grLastPulseMap.has(uid)) grLastPulseMap.set(uid, pc.pulse_state as string)
      }

      // Weekly reflections completed — set of 'challengeId:weekNumber' keys
      const { data: grReflections } = await sb
        .from('weekly_reflections')
        .select('challenge_id, week_number')
        .in('challenge_id', grEveningChallengeIds)
      const grReflectionSet = new Set(
        (grReflections ?? []).map(r => `${r.challenge_id as string}:${r.week_number as number}`)
      )

      // Group membership data for de-duped nudge (same logic as Jamming group nudge)
      const { data: grMemberRows } = await sb
        .from('group_members')
        .select('user_id, group_id')
        .in('user_id', grEveningUserIds)
        .eq('active', true)
      const grAllGroupIds = [...new Set((grMemberRows ?? []).map(r => r.group_id as string))]

      type GrStatusRow = { group_id: string; user_id: string; completion_status: string }
      let grGroupStatusRows: GrStatusRow[] = []
      const grGroupNameMap = new Map<string, string>()
      if (grAllGroupIds.length > 0) {
        const [grStatusRes, grGroupRes] = await Promise.all([
          sb
            .from('group_daily_status')
            .select('group_id, user_id, completion_status')
            .in('group_id', grAllGroupIds)
            .eq('status_date', today)
            .in('completion_status', ['full', 'partial']),
          sb
            .from('consistency_groups')
            .select('id, name')
            .in('id', grAllGroupIds)
            .eq('status', 'active'),
        ])
        grGroupStatusRows = (grStatusRes.data ?? []) as GrStatusRow[]
        for (const g of (grGroupRes.data ?? [])) {
          grGroupNameMap.set(g.id as string, g.name as string)
        }
      }

      // Track which Grooving users already received an evening notification this run
      const grEveningNotified = new Set<string>()

      for (const challenge of grEveningChallenges) {
        const userId  = challenge.user_id as string
        const profile = grEveningProfileMap.get(userId)
        if (!profile) continue
        if (grCheckedInToday.has(userId)) continue  // already checked in

        const startMs   = new Date((challenge.start_date as string) + 'T00:00:00').getTime()
        const todayMs   = new Date(today + 'T00:00:00').getTime()
        const dayNumber = Math.max(Math.floor((todayMs - startMs) / 86_400_000) + 1, 1)
        const weekNumber = Math.ceil(dayNumber / 7)
        const tier = profile.notification_tier as string

        // Priority 1: Weekly reflection prompt — all tiers, fires on Day 7/14/21/...
        // If this fires, skip both group nudge and evening check-in for this user.
        if (dayNumber % 7 === 0 && !grReflectionSet.has(`${challenge.id as string}:${weekNumber}`)) {
          notifications.push({ userId, message: GROOVING_NOTIFICATIONS.weekly_reflection_prompt() })
          sent++
          grEveningNotified.add(userId)
          continue
        }

        if (grEveningNotified.has(userId)) continue

        // Priority 2: Group nudge — mirrors Jamming group nudge logic
        const userGroupIds = (grMemberRows ?? [])
          .filter(r => r.user_id === userId)
          .map(r => r.group_id as string)

        let groupNudged = false
        for (const groupId of userGroupIds) {
          const othersIn = grGroupStatusRows.filter(s => s.group_id === groupId && s.user_id !== userId)
          if (othersIn.length > 0) {
            const groupName = grGroupNameMap.get(groupId) ?? 'your group'
            notifications.push({ userId, message: GROUP_NOTIFICATIONS.evening_nudge({ count: othersIn.length, groupName }) })
            sent++
            grEveningNotified.add(userId)
            groupNudged = true
            break
          }
        }

        // Priority 3: Evening check-in — Rough Waters / Taking On Water only, standard/full tier
        if (!groupNudged && tier !== 'minimal') {
          const lastPulse = grLastPulseMap.get(userId)
          if (lastPulse === 'rough_waters' || lastPulse === 'taking_on_water') {
            notifications.push({ userId, message: GROOVING_NOTIFICATIONS.evening_checkin() })
            sent++
          }
        }
      }
    }
  }

  // ── Auto-resume overdue pauses (Step 27 — morning run only) ──────────────────
  // Runs once daily at 7 AM.  autoResumePausedChallenges() catches all its own
  // errors internally, so this block can never throw and crash the cron.
  if (time === 'morning') {
    await autoResumePausedChallenges()
  }

  console.log(`[notifications/cron] time=${time} sent=${sent}`, notifications)
  return NextResponse.json({ sent, time })
}
