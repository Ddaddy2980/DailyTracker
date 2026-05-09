import { addDays } from '@/lib/constants'
import type { PillarLevel, DurationGoal, PillarDailyEntry, PillarName } from '@/lib/types'

export function formatWeekRange(weekStart: string): string {
  const end = addDays(weekStart, 6)
  const s = new Date(weekStart + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
  })
}

export function getPillarPct(
  pillar: PillarName,
  date: string,
  entryIndex: Map<string, PillarDailyEntry>,
  goalsByPillar: Map<PillarName, DurationGoal[]>,
): number | null {
  const entry = entryIndex.get(`${pillar}|${date}`)
  if (!entry) return null
  const pillarGoals = goalsByPillar.get(pillar) ?? []
  if (pillarGoals.length === 0) return null
  const completedCount = pillarGoals.filter((g) => entry.goal_completions?.[g.id] === true).length
  return Math.round((completedCount / pillarGoals.length) * 100)
}

export function getAllPct(
  date: string,
  entryIndex: Map<string, PillarDailyEntry>,
  activePillars: PillarLevel[],
  goalsByPillar: Map<PillarName, DurationGoal[]>,
): number | null {
  const pillarPcts = activePillars
    .map((p) => getPillarPct(p.pillar, date, entryIndex, goalsByPillar))
    .filter((pct): pct is number => pct !== null)
  if (pillarPcts.length === 0) return null
  return Math.round(pillarPcts.reduce((a, b) => a + b, 0) / pillarPcts.length)
}

export function cellStyle(pct: number | null, isFuture: boolean, isBeforeChallenge: boolean): string {
  const base = 'w-full h-10 rounded flex items-center justify-center text-[9px] font-medium transition-colors'
  if (isBeforeChallenge || isFuture) return `${base} bg-slate-800 text-slate-600 cursor-default`
  if (pct === null) return `${base} bg-slate-600 text-slate-400`
  if (pct >= 80) return `${base} bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700`
  if (pct >= 40) return `${base} bg-amber-500 text-white cursor-pointer hover:bg-amber-600`
  return `${base} bg-red-600 text-white cursor-pointer hover:bg-red-700`
}
