import type { PillarName, OperatingState, PillarLevel } from './types'

const PILLAR_NAMES: PillarName[] = [
  'spiritual',
  'physical',
  'nutritional',
  'personal',
  'missional',
]

export function resolveOperatingState(level: number): OperatingState {
  if (level === 1) return 'building'
  if (level === 2 || level === 3) return 'developing'
  if (level === 4 || level === 5) return 'anchored'
  throw new Error(`resolveOperatingState: invalid level ${level}. Must be 1–5.`)
}

export function resolvePillarStates(
  pillarLevels: PillarLevel[]
): Record<PillarName, OperatingState> {
  const result = {} as Record<PillarName, OperatingState>

  for (const pillar of PILLAR_NAMES) {
    const row = pillarLevels.find((r) => r.pillar === pillar)
    result[pillar] = row ? resolveOperatingState(row.level) : 'dormant'
  }

  return result
}

export function getChallengeDuration(
  pillarStates: Record<PillarName, OperatingState>,
  pillarLevels: PillarLevel[]
): { minDays: number; maxDays: number; options: number[] } {
  const activeRows = pillarLevels.filter(
    (r) => pillarStates[r.pillar as PillarName] !== 'dormant'
  )

  // Any building pillar → 7-day challenge required
  const hasBuilding = Object.values(pillarStates).includes('building')
  if (hasBuilding) {
    return { minDays: 7, maxDays: 7, options: [7] }
  }

  // No active pillars at all → default to 7
  if (activeRows.length === 0) {
    return { minDays: 7, maxDays: 7, options: [7] }
  }

  const highestLevel = Math.max(...activeRows.map((r) => r.level))

  if (highestLevel === 2) {
    return { minDays: 14, maxDays: 14, options: [14] }
  }

  if (highestLevel === 3) {
    return { minDays: 30, maxDays: 66, options: [30, 50, 66] }
  }

  // All active pillars anchored (level 4 or 5)
  return { minDays: 30, maxDays: 100, options: [30, 66, 100] }
}

