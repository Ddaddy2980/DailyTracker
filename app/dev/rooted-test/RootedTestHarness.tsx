'use client'

import { useState, useTransition } from 'react'
import { runScenario, runAllScenarios, type ScenarioRunResult } from './scenarioActions'
import type { RootedMilestoneResult } from '@/lib/milestones'

const SCENARIOS = [
  {
    id:          1,
    name:        'Scenario 1 — Should fire',
    description: 'Day 45, carried-forward goal, 42 of 45 days complete (3 missed total).',
    expected:    'fired: true',
  },
  {
    id:          2,
    name:        'Scenario 2 — Should NOT fire',
    description: 'Day 45, same goal but 41 of 45 days complete (4 missed — one over the limit).',
    expected:    'fired: false',
  },
  {
    id:          3,
    name:        'Scenario 3 — Should NOT fire',
    description: 'Day 35, goal completed every day — too early, before the Day 40 window.',
    expected:    'fired: false',
  },
  {
    id:          4,
    name:        'Scenario 4 — Should NOT fire',
    description: 'Day 45, 42 completions, but carried_forward_pillars is empty — treated as a new goal.',
    expected:    'fired: false',
  },
  {
    id:          5,
    name:        'Scenario 5 — Should NOT fire',
    description: 'Day 45, all conditions met, but rooted_milestone_fired is already true.',
    expected:    'fired: false',
  },
  {
    id:          6,
    name:        'Scenario 6 — Should fire on higher-count goal',
    description: 'Day 44, two qualifying goals: spiritual=41/44 (missed=3), physical=43/44 (missed=1). Must fire on physical.',
    expected:    'fired: true, goalName: "Work out every day"',
  },
  {
    id:          7,
    name:        'Scenario 7 — Edge case: Day 50, 10 missed',
    description: 'Day 50, 40 of 50 days complete — 10 missed days far exceeds the 3-miss limit.',
    expected:    'fired: false',
  },
  {
    id:          8,
    name:        'Scenario 8 — Should fire despite edited goal text',
    description: 'Day 45, 42 completions. User edited the goal text during Grooving onboarding, but carried_forward_pillars includes the pillar. Must fire on the edited text.',
    expected:    'fired: true (text change must not matter)',
  },
]

function ResultDisplay({ result }: { result: RootedMilestoneResult }) {
  if (result.fired) {
    return (
      <div className="font-mono text-xs space-y-0.5">
        <div><span className="text-slate-500">fired:</span> <span className="text-emerald-400 font-bold">true</span></div>
        <div><span className="text-slate-500">goalName:</span> <span className="text-white">&quot;{result.goalName}&quot;</span></div>
        <div><span className="text-slate-500">pillar:</span> <span className="text-violet-400">{result.pillar}</span></div>
        <div><span className="text-slate-500">completionCount:</span> <span className="text-amber-400">{result.completionCount}</span></div>
      </div>
    )
  }
  return (
    <div className="font-mono text-xs space-y-0.5">
      <div><span className="text-slate-500">fired:</span> <span className="text-red-400 font-bold">false</span></div>
      <div><span className="text-slate-500">reason:</span> <span className="text-amber-300">&quot;{result.reason}&quot;</span></div>
    </div>
  )
}

function ScenarioCard({
  scenario,
  runResult,
  onRun,
  isPending,
}: {
  scenario:  typeof SCENARIOS[0]
  runResult: ScenarioRunResult | null
  onRun:     () => void
  isPending: boolean
}) {
  const statusColor = runResult === null
    ? 'border-slate-700'
    : runResult.pass
    ? 'border-emerald-700'
    : 'border-red-700'

  return (
    <div className={`bg-slate-900 border-2 rounded-2xl p-5 space-y-4 ${statusColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-white font-bold text-sm">{scenario.name}</p>
          <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{scenario.description}</p>
        </div>
        {runResult !== null && (
          <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded-lg flex-shrink-0
            ${runResult.pass
              ? 'bg-emerald-900/60 text-emerald-400'
              : 'bg-red-900/60 text-red-400'
            }`}>
            {runResult.pass ? 'PASS' : 'FAIL'}
          </span>
        )}
      </div>

      {/* Expected */}
      <div className="bg-slate-800/50 rounded-xl px-3 py-2">
        <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wide">Expected</p>
        <p className="text-xs font-mono text-slate-300">{scenario.expected}</p>
      </div>

      {/* Input summary (shown after run) */}
      {runResult && (
        <div className="bg-slate-800/50 rounded-xl px-3 py-2 space-y-1">
          <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wide">Input</p>
          <div className="font-mono text-xs space-y-0.5">
            <div>
              <span className="text-slate-500">dayNumber:</span>{' '}
              <span className="text-amber-400">{runResult.inputSummary.dayNumber}</span>
            </div>
            <div>
              <span className="text-slate-500">carriedForwardPillars:</span>{' '}
              <span className="text-violet-400">
                [{runResult.inputSummary.carriedForwardPillars.map(p => `"${p}"`).join(', ')}]
              </span>
            </div>
            <div>
              <span className="text-slate-500">pillarGoals:</span>{' '}
              <span className="text-white">
                {'{'}
                {Object.entries(runResult.inputSummary.pillarGoals)
                  .map(([k, v]) => `${k}: "${v}"`)
                  .join(', ')}
                {'}'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">completionCounts:</span>{' '}
              <span className="text-emerald-400">
                {'{'}
                {Object.entries(runResult.inputSummary.completionCounts)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(', ')}
                {'}'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">rootedMilestoneFired:</span>{' '}
              <span className={runResult.inputSummary.rootedMilestoneFired ? 'text-red-400' : 'text-emerald-400'}>
                {String(runResult.inputSummary.rootedMilestoneFired)}
              </span>
            </div>
          </div>
          {runResult.inputSummary.note && (
            <p className="text-slate-500 text-xs mt-1.5 italic leading-relaxed">
              Note: {runResult.inputSummary.note}
            </p>
          )}
        </div>
      )}

      {/* Result (shown after run) */}
      {runResult && (
        <div className="bg-slate-800/50 rounded-xl px-3 py-2">
          <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wide">Result</p>
          <ResultDisplay result={runResult.result} />
        </div>
      )}

      {/* Run button */}
      <button
        onClick={onRun}
        disabled={isPending}
        className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors
          ${isPending
            ? 'bg-slate-800 text-slate-600 cursor-wait'
            : 'bg-violet-700 hover:bg-violet-600 text-white active:scale-95'
          }`}
      >
        {isPending ? 'Running…' : runResult ? 'Re-run' : 'Run'}
      </button>
    </div>
  )
}

export default function RootedTestHarness() {
  const [results, setResults] = useState<Record<number, ScenarioRunResult>>({})
  const [runningId, setRunningId] = useState<number | null>(null)
  const [runningAll, setRunningAll] = useState(false)
  const [, startTransition] = useTransition()

  function handleRun(id: number) {
    setRunningId(id)
    startTransition(async () => {
      const result = await runScenario(id)
      setResults(prev => ({ ...prev, [id]: result }))
      setRunningId(null)
    })
  }

  function handleRunAll() {
    setRunningAll(true)
    startTransition(async () => {
      const allResults = await runAllScenarios()
      const map: Record<number, ScenarioRunResult> = {}
      allResults.forEach((r, i) => { map[i + 1] = r })
      setResults(map)
      setRunningAll(false)
    })
  }

  const ranCount  = Object.keys(results).length
  const passCount = Object.values(results).filter(r => r.pass).length

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-5 pt-10 pb-20 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-900/40 border border-amber-700/50 px-2 py-0.5 rounded-full">
              DEV ONLY
            </span>
          </div>
          <h1 className="text-2xl font-black mt-2">Rooted Milestone — Test Harness</h1>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed">
            Tests <code className="text-violet-400 bg-slate-800 px-1 rounded">evaluateRootedMilestone()</code> with
            synthetic data. No DB reads or writes. No real user data is affected.
          </p>
        </div>

        {/* Run All + summary */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleRunAll}
            disabled={runningAll}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors
              ${runningAll
                ? 'bg-slate-800 text-slate-500 cursor-wait'
                : 'bg-white text-slate-950 hover:bg-slate-200 active:scale-95'
              }`}
          >
            {runningAll ? 'Running all…' : '▶ Run All (8 scenarios)'}
          </button>

          {ranCount > 0 && (
            <div className={`text-sm font-bold ${passCount === ranCount ? 'text-emerald-400' : 'text-red-400'}`}>
              {passCount} / {ranCount} passed
              {passCount === ranCount && ranCount === 8 && ' ✓ All pass'}
            </div>
          )}
        </div>

        {/* Scenario cards */}
        <div className="space-y-4">
          {SCENARIOS.map(scenario => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              runResult={results[scenario.id] ?? null}
              onRun={() => handleRun(scenario.id)}
              isPending={runningId === scenario.id || runningAll}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
