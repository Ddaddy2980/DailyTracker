'use client'

import { useState, useEffect } from 'react'
import { JAMMING_NOTIFICATIONS, GROOVING_NOTIFICATIONS } from '@/lib/constants'
import { resolveMorningTone } from '@/lib/morning-tone'
import type { PillarLevel } from '@/lib/types'

interface Props {
  checkInComplete:     boolean
  notificationTier:    'minimal' | 'standard' | 'full'
  dayNumber:           number
  durationDays?:       number
  pillars:             string[]
  missedYesterday:     boolean
  // ── Grooving-specific (Step 29) ────────────────────────────────────────────
  level?:              number          // 2 = Jamming (default), 3 = Grooving
  patternAlertDay?:    string | null   // e.g. 'Mondays' — set by server page when pattern detected
  rootedMilestoneToday?: boolean       // rooted_milestone_date = today
  onPatternAlertCta?:  () => void      // called when user clicks 'Review my goals'
  // ── Step 42 ────────────────────────────────────────────────────────────────
  pillarLevels?:       PillarLevel[]  // used for adaptive morning tone (level 3 only)
}

interface BannerContent {
  message:    string
  cta:        string
  color:      string
  icon:       string
  ctaAction?: () => void  // optional callback for actionable CTA button
}

function getBannerContent(
  hourOfDay:           number,
  checkInComplete:     boolean,
  notificationTier:    'minimal' | 'standard' | 'full',
  dayNumber:           number,
  durationDays:        number,
  pillars:             string[],
  missedYesterday:     boolean,
  level:               number,
  patternAlertDay:     string | null | undefined,
  rootedMilestoneToday: boolean | undefined,
  onPatternAlertCta:   (() => void) | undefined,
  pillarLevels:        PillarLevel[],
): BannerContent | null {
  // ── Grooving-specific banners (level 3) — highest priority ──────────────────
  if (level === 3) {
    // Rooted milestone banner — shown the day the milestone fires
    if (rootedMilestoneToday) {
      return {
        message: GROOVING_NOTIFICATIONS.rooted_milestone({ goalName: 'Your habit' }),
        cta:     '',
        color:   'bg-emerald-950 border-emerald-700',
        icon:    '🌱',
      }
    }

    // Habit calendar pattern alert — dismissible with 'Review my goals' CTA
    if (patternAlertDay) {
      return {
        message:   GROOVING_NOTIFICATIONS.pattern_alert({ dayOfWeek: patternAlertDay }),
        cta:       'Review my goals',
        color:     'bg-amber-950 border-amber-700',
        icon:      '📅',
        ctaAction: onPatternAlertCta,
      }
    }
  }

  // Morning anchor (level 3 only) — 6am–12pm, not yet checked in
  if (level === 3 && !checkInComplete && hourOfDay >= 6 && hourOfDay < 12) {
    const { tone, highestDevelopingLevel } = resolveMorningTone(pillarLevels)
    let message: string
    switch (tone) {
      case 'motivational':
        message = GROOVING_NOTIFICATIONS.morning_anchor_motivational({ dayNumber, durationDays })
        break
      case 'coaching':
        message = GROOVING_NOTIFICATIONS.morning_anchor_coaching({ dayNumber, durationDays, highestLevel: highestDevelopingLevel ?? 3 })
        break
      case 'reflective':
        message = GROOVING_NOTIFICATIONS.morning_anchor_reflective()
        break
    }
    return { message, cta: '', color: 'bg-slate-800 border-slate-600', icon: '🌄' }
  }

  // Miss-day recovery — always shown regardless of tier, once per day
  if (missedYesterday && !checkInComplete) {
    return {
      message: JAMMING_NOTIFICATIONS.miss_day_recovery(),
      cta:     'Check in today →',
      color:   'bg-amber-950 border-amber-700',
      icon:    '🌅',
    }
  }

  // Already checked in — no banner needed
  if (checkInComplete) return null

  // Late rescue — 9:45 PM+, full tier only
  if (hourOfDay >= 21 && notificationTier === 'full') {
    return {
      message: JAMMING_NOTIFICATIONS.late_rescue(),
      cta:     'Check in now →',
      color:   'bg-red-950 border-red-700',
      icon:    '🆘',
    }
  }

  // Evening check-in — 8 PM+, standard or full tier
  if (hourOfDay >= 20 && notificationTier !== 'minimal') {
    return {
      message: JAMMING_NOTIFICATIONS.evening_checkin({ pillars }),
      cta:     'Check in →',
      color:   'bg-slate-800 border-slate-600',
      icon:    '🌙',
    }
  }

  // Mid-week — Wednesday (day 3 of the week), standard or full tier
  const isWednesday = new Date().getDay() === 3
  if (isWednesday && notificationTier !== 'minimal') {
    return {
      message: JAMMING_NOTIFICATIONS.mid_week_encouragement({ dayNumber }),
      cta:     'Check in →',
      color:   'bg-purple-950 border-purple-700',
      icon:    '⚡',
    }
  }

  return null
}

export default function NotificationBanner({
  checkInComplete, notificationTier, dayNumber, durationDays = 30, pillars, missedYesterday,
  level = 2, patternAlertDay, rootedMilestoneToday, onPatternAlertCta,
  pillarLevels = [],
}: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [content,   setContent]   = useState<BannerContent | null>(null)

  useEffect(() => {
    const hour = new Date().getHours()
    setContent(getBannerContent(
      hour, checkInComplete, notificationTier, dayNumber, durationDays, pillars, missedYesterday,
      level, patternAlertDay, rootedMilestoneToday, onPatternAlertCta, pillarLevels,
    ))
  }, [checkInComplete, notificationTier, dayNumber, durationDays, pillars, missedYesterday,
      level, patternAlertDay, rootedMilestoneToday, onPatternAlertCta, pillarLevels])

  if (!content || dismissed) return null

  return (
    <div className={`rounded-2xl border p-4 flex items-start gap-3 ${content.color}`}>
      <span className="text-xl shrink-0">{content.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white leading-snug">{content.message}</p>
        {content.ctaAction && content.cta && (
          <button
            onClick={() => { content.ctaAction?.(); setDismissed(true) }}
            className="mt-2 text-xs font-bold text-white underline underline-offset-2 hover:no-underline transition-all"
          >
            {content.cta} →
          </button>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-slate-500 hover:text-slate-300 shrink-0 text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
