'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  PillarName,
  GoalType,
  LevelNumber,
  GoalCommitApiResponse,
} from '@/lib/types'

// One press-and-hold commit of a single goal. challengeId + entryDate are fixed
// for the hook's lifetime (entryDate = the day being viewed); pillar/goal vary
// per call because one hook instance in DashboardShell serves every card.
export interface GoalCommitArgs {
  pillar:   PillarName
  goalId:   string
  goalType: GoalType
  done:     boolean
}

// Discriminated result so the caller can reconcile its optimistic state against
// server truth on success, or roll back on failure. The hook never throws.
export type GoalCommitResult =
  | { ok: true;  data: GoalCommitApiResponse }
  | { ok: false; error: string }

/**
 * Commit engine for v4 per-goal check-ins.
 *
 * - **Queued**: every commit chains onto the previous one (FIFO). The server
 *   merges each goal into the entry's jsonb map atomically, but it also does a
 *   read-modify-write on `streak_state`; serializing one user's rapid taps keeps
 *   those off the optimistic-concurrency retry path and keeps ordering honest.
 * - **inFlight**: goalIds currently committing (from the moment `commit` is
 *   called until it settles), so a `GoalRing` can disable itself. The UI must
 *   guard re-entry on an already-in-flight goal (commit-only, no un-check).
 * - **Advancement**: when a commit reports a level-up, `advancedToLevel` is set
 *   for `AdvancementCelebrationModal`. Refresh is deferred to `dismissAdvancement`
 *   so the modal stays mounted through its animation.
 *
 * Optimistic completion state, the seal cascade, and Tempo orchestration live in
 * the caller (DashboardShell) — this hook only performs and sequences the writes.
 */
export function useGoalCommit(challengeId: string, entryDate: string) {
  const router = useRouter()
  const [inFlight, setInFlight]               = useState<Set<string>>(new Set())
  const [advancedToLevel, setAdvancedToLevel] = useState<LevelNumber | null>(null)

  // Tail of the commit chain. Always resolves (errors are swallowed here so the
  // next commit's `.then` still fires); real results flow through `run` below.
  const queueRef = useRef<Promise<void>>(Promise.resolve())

  const markInFlight = useCallback((goalId: string, active: boolean) => {
    setInFlight((prev) => {
      const next = new Set(prev)
      if (active) next.add(goalId)
      else next.delete(goalId)
      return next
    })
  }, [])

  const commit = useCallback(
    (args: GoalCommitArgs): Promise<GoalCommitResult> => {
      markInFlight(args.goalId, true)

      const run = queueRef.current.then(async (): Promise<GoalCommitResult> => {
        try {
          const res = await fetch('/api/checkin', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pillar:     args.pillar,
              challengeId,
              goalId:     args.goalId,
              goalType:   args.goalType,
              done:       args.done,
              entry_date: entryDate,
            }),
          })
          if (!res.ok) {
            const errData = (await res.json().catch(() => ({}))) as { error?: string }
            return { ok: false, error: errData.error ?? 'Save failed. Please try again.' }
          }
          const data = (await res.json()) as GoalCommitApiResponse
          if (data.advanced && data.newLevel) {
            setAdvancedToLevel(data.newLevel)
          }
          return { ok: true, data }
        } catch {
          return { ok: false, error: 'Could not reach the server. Please try again.' }
        }
      })

      // Chain the tail regardless of this commit's outcome.
      queueRef.current = run.then(() => undefined, () => undefined)

      return run.finally(() => markInFlight(args.goalId, false))
    },
    [challengeId, entryDate, markInFlight],
  )

  // Level-up: re-render with the new level (its card variant/dots change) only
  // once the user dismisses the celebration — never mid-animation.
  const dismissAdvancement = useCallback(() => {
    setAdvancedToLevel(null)
    router.refresh()
  }, [router])

  return { commit, inFlight, advancedToLevel, dismissAdvancement }
}
