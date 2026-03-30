'use server'

import {
  evaluateRootedMilestone,
  addDaysStr,
  type MilestoneEntry,
  type MilestoneInput,
  type RootedMilestoneResult,
} from '@/lib/milestones'

// ── Synthetic data builders ───────────────────────────────────────────────────

/** Build a single daily_entries-shaped row for a given date and completed pillars. */
function buildEntry(date: string, completedPillars: string[]): MilestoneEntry {
  const complete = { challenge_complete: true }
  const empty    = {}
  return {
    entry_date:     date,
    spiritual:      completedPillars.includes('spiritual')   ? complete : empty,
    physical_goals: completedPillars.includes('physical')    ? complete : empty,
    nutritional:    completedPillars.includes('nutritional') ? complete : empty,
    personal:       completedPillars.includes('personal')    ? complete : empty,
  }
}

/**
 * Build entries for `totalDays` days starting at `startDate`.
 * `missedDayNumbers` is a 1-based list of day numbers to skip (no entry written).
 * `pillars` is the list of pillars to mark complete on non-missed days.
 */
function buildEntries(
  startDate:       string,
  totalDays:       number,
  pillars:         string[],
  missedDayNumbers: number[],
): MilestoneEntry[] {
  const missed = new Set(missedDayNumbers)
  const result: MilestoneEntry[] = []
  for (let i = 0; i < totalDays; i++) {
    if (!missed.has(i + 1)) {
      result.push(buildEntry(addDaysStr(startDate, i), pillars))
    }
  }
  return result
}

// Fixed test date for reproducibility
const TEST_TODAY = '2026-03-26'

function startDateForDay(dayNumber: number): string {
  return addDaysStr(TEST_TODAY, -(dayNumber - 1))
}

// ── Scenario definitions ──────────────────────────────────────────────────────

export interface ScenarioRunResult {
  result:       RootedMilestoneResult
  inputSummary: {
    dayNumber:             number
    carriedForwardPillars: string[]
    pillarGoals:           Record<string, string>
    completionCounts:      Record<string, number>
    rootedMilestoneFired:  boolean
    note?:                 string
  }
  expected: { fired: boolean; goalName?: string }
  pass:     boolean
}

function countCompletions(
  entries:   MilestoneEntry[],
  pillar:    string,
  startDate: string,
  dayCount:  number,
): number {
  const entryMap = new Map(entries.map(e => [e.entry_date, e]))
  const COL: Record<string, keyof MilestoneEntry> = {
    spiritual:   'spiritual',
    physical:    'physical_goals',
    nutritional: 'nutritional',
    personal:    'personal',
  }
  let count = 0
  for (let i = 0; i < dayCount; i++) {
    const date  = addDaysStr(startDate, i)
    const entry = entryMap.get(date)
    const col   = COL[pillar]
    if (entry && col) {
      const cell = entry[col] as Record<string, unknown>
      if (cell?.challenge_complete === true) count++
    }
  }
  return count
}

function buildAndRun(input: MilestoneInput): RootedMilestoneResult {
  return evaluateRootedMilestone(input)
}

export async function runScenario(scenarioId: number): Promise<ScenarioRunResult> {
  // Each scenario builds synthetic MilestoneInput and calls evaluateRootedMilestone.
  // No DB writes. No real user data touched.

  let input: MilestoneInput
  let expected: { fired: boolean; goalName?: string }
  let note: string | undefined

  switch (scenarioId) {

    // ── Scenario 1: Should fire ─────────────────────────────────────────────
    // Day 45, carried-forward goal, 42 completions, 3 missed
    case 1: {
      const dayNumber  = 45
      const startDate  = startDateForDay(dayNumber)
      const pillar     = 'spiritual'
      const goalName   = 'Pray daily'
      const entries    = buildEntries(startDate, dayNumber, [pillar], [10, 20, 30])
      input = {
        challengeLevel:        3,
        challengeStatus:       'active',
        challengeStartDate:    startDate,
        pillarGoals:           { [pillar]: goalName },
        carriedForwardPillars: [pillar],
        dayNumber,
        rootedMilestoneFired:  false,
        entries,
        today:                 TEST_TODAY,
      }
      expected = { fired: true, goalName }
      break
    }

    // ── Scenario 2: Should NOT fire — 4 missed days ─────────────────────────
    case 2: {
      const dayNumber = 45
      const startDate = startDateForDay(dayNumber)
      const pillar    = 'spiritual'
      const goalName  = 'Pray daily'
      const entries   = buildEntries(startDate, dayNumber, [pillar], [10, 20, 30, 40])
      input = {
        challengeLevel:        3,
        challengeStatus:       'active',
        challengeStartDate:    startDate,
        pillarGoals:           { [pillar]: goalName },
        carriedForwardPillars: [pillar],
        dayNumber,
        rootedMilestoneFired:  false,
        entries,
        today:                 TEST_TODAY,
      }
      expected = { fired: false }
      break
    }

    // ── Scenario 3: Should NOT fire — Day 35, too early ─────────────────────
    case 3: {
      const dayNumber = 35
      const startDate = startDateForDay(dayNumber)
      const pillar    = 'spiritual'
      const goalName  = 'Pray daily'
      const entries   = buildEntries(startDate, dayNumber, [pillar], [])
      input = {
        challengeLevel:        3,
        challengeStatus:       'active',
        challengeStartDate:    startDate,
        pillarGoals:           { [pillar]: goalName },
        carriedForwardPillars: [pillar],
        dayNumber,
        rootedMilestoneFired:  false,
        entries,
        today:                 TEST_TODAY,
      }
      expected = { fired: false }
      break
    }

    // ── Scenario 4: Should NOT fire — new goal, not in carried_forward_pillars
    case 4: {
      const dayNumber = 45
      const startDate = startDateForDay(dayNumber)
      const pillar    = 'spiritual'
      const goalName  = 'New goal added at Grooving'
      const entries   = buildEntries(startDate, dayNumber, [pillar], [10, 20, 30])
      input = {
        challengeLevel:        3,
        challengeStatus:       'active',
        challengeStartDate:    startDate,
        pillarGoals:           { [pillar]: goalName },
        carriedForwardPillars: [],          // pillar NOT in array → new goal
        dayNumber,
        rootedMilestoneFired:  false,
        entries,
        today:                 TEST_TODAY,
      }
      expected = { fired: false }
      note = 'carried_forward_pillars is empty — all goals treated as new'
      break
    }

    // ── Scenario 5: Should NOT fire — already fired ─────────────────────────
    case 5: {
      const dayNumber = 45
      const startDate = startDateForDay(dayNumber)
      const pillar    = 'spiritual'
      const goalName  = 'Pray daily'
      const entries   = buildEntries(startDate, dayNumber, [pillar], [10, 20, 30])
      input = {
        challengeLevel:        3,
        challengeStatus:       'active',
        challengeStartDate:    startDate,
        pillarGoals:           { [pillar]: goalName },
        carriedForwardPillars: [pillar],
        dayNumber,
        rootedMilestoneFired:  true,        // ← already fired
        entries,
        today:                 TEST_TODAY,
      }
      expected = { fired: false }
      break
    }

    // ── Scenario 6: Should fire on higher-count goal ─────────────────────────
    // Day 44: spiritual=41 (missed=3 ✓), physical=43 (missed=1 ✓)
    // Both qualify; must fire on physical (43 completions)
    case 6: {
      const dayNumber    = 44
      const startDate    = startDateForDay(dayNumber)
      const spiritualGoal = 'Pray daily'
      const physicalGoal  = 'Work out every day'
      const spiritualEntries = buildEntries(startDate, dayNumber, ['spiritual'], [10, 20, 30])
      const physicalEntries  = buildEntries(startDate, dayNumber, ['physical'],  [10])
      // Merge both pillar entries per date
      const dateMap = new Map<string, MilestoneEntry>()
      for (const e of spiritualEntries) {
        dateMap.set(e.entry_date, { ...buildEntry(e.entry_date, []), spiritual: e.spiritual })
      }
      for (const e of physicalEntries) {
        const existing = dateMap.get(e.entry_date) ?? buildEntry(e.entry_date, [])
        dateMap.set(e.entry_date, { ...existing, physical_goals: e.physical_goals })
      }
      const entries = Array.from(dateMap.values())
      input = {
        challengeLevel:        3,
        challengeStatus:       'active',
        challengeStartDate:    startDate,
        pillarGoals:           { spiritual: spiritualGoal, physical: physicalGoal },
        carriedForwardPillars: ['spiritual', 'physical'],
        dayNumber,
        rootedMilestoneFired:  false,
        entries,
        today:                 TEST_TODAY,
      }
      expected = { fired: true, goalName: physicalGoal }
      note = 'spiritual=41/44 (missed=3), physical=43/44 (missed=1) — tiebreak fires on physical'
      break
    }

    // ── Scenario 7: Edge case — Day 50, 40 completions, 10 missed ───────────
    case 7: {
      const dayNumber = 50
      const startDate = startDateForDay(dayNumber)
      const pillar    = 'spiritual'
      const goalName  = 'Pray daily'
      // 40 complete, 10 missed: miss days 5,10,15,20,25,30,35,40,45,50
      const entries   = buildEntries(startDate, dayNumber, [pillar], [5,10,15,20,25,30,35,40,45,50])
      input = {
        challengeLevel:        3,
        challengeStatus:       'active',
        challengeStartDate:    startDate,
        pillarGoals:           { [pillar]: goalName },
        carriedForwardPillars: [pillar],
        dayNumber,
        rootedMilestoneFired:  false,
        entries,
        today:                 TEST_TODAY,
      }
      expected = { fired: false }
      note = '40 completions out of 50 days = 10 missed — exceeds 3-miss limit'
      break
    }

    // ── Scenario 8: Should fire despite edited goal text ────────────────────
    // Pillar is in carried_forward_pillars even though text was changed.
    // This is the scenario that was broken before Option 2.
    case 8: {
      const dayNumber   = 45
      const startDate   = startDateForDay(dayNumber)
      const pillar      = 'spiritual'
      const editedGoal  = 'Read one chapter of Scripture daily'   // edited from original
      const entries     = buildEntries(startDate, dayNumber, [pillar], [10, 20, 30])
      input = {
        challengeLevel:        3,
        challengeStatus:       'active',
        challengeStartDate:    startDate,
        pillarGoals:           { [pillar]: editedGoal },
        carriedForwardPillars: [pillar],   // ← pillar in array despite text change
        dayNumber,
        rootedMilestoneFired:  false,
        entries,
        today:                 TEST_TODAY,
      }
      expected = { fired: true, goalName: editedGoal }
      note = 'Original text: "Read at least one chapter of Scripture every day" — user edited it during Grooving onboarding. carried_forward_pillars includes "spiritual", so it fires correctly.'
      break
    }

    default:
      throw new Error(`Unknown scenario ID: ${scenarioId}`)
  }

  const result = buildAndRun(input)

  // Compute actual completion counts for display
  const completionCounts: Record<string, number> = {}
  for (const pillar of Object.keys(input.pillarGoals)) {
    completionCounts[pillar] = countCompletions(
      input.entries, pillar, input.challengeStartDate, input.dayNumber
    )
  }

  const pass = result.fired === expected.fired &&
    (!expected.goalName || (result.fired && result.goalName === expected.goalName))

  return {
    result,
    inputSummary: {
      dayNumber:             input.dayNumber,
      carriedForwardPillars: input.carriedForwardPillars,
      pillarGoals:           Object.fromEntries(
        Object.entries(input.pillarGoals).map(([k, v]) => [k, String(v)])
      ),
      completionCounts,
      rootedMilestoneFired:  input.rootedMilestoneFired,
      note,
    },
    expected,
    pass,
  }
}

export async function runAllScenarios(): Promise<ScenarioRunResult[]> {
  return Promise.all([1,2,3,4,5,6,7,8].map(id => runScenario(id)))
}
