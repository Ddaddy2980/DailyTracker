'use client'

import { useState } from 'react'
import { DESTINATION_GOAL_CAP, destinationGoalCapReached } from '@/lib/constants'
import type { DestinationGoal, LevelNumber } from '@/lib/types'

interface DestinationGoalSectionProps {
  pillar: string
  level:  LevelNumber
  initialGoals: DestinationGoal[]
}

export default function DestinationGoalSection({
  pillar,
  level,
  initialGoals,
}: DestinationGoalSectionProps) {
  const [goals, setGoals]     = useState<DestinationGoal[]>(initialGoals)
  const [adding, setAdding]   = useState(false)
  const [inputText, setInput] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const atCap = destinationGoalCapReached(level, goals.length)
  const cap   = DESTINATION_GOAL_CAP[level]

  // ── Add ────────────────────────────────────────────────────────────────────

  async function handleAdd() {
    const text = inputText.trim()
    if (!text || saving) return
    setError(null)
    setSaving(true)

    try {
      const res = await fetch('/api/goals/destination', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pillar, goal_text: text }),
      })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        setError(json.error ?? 'Failed to save goal.')
        return
      }
      const { goal } = (await res.json()) as { goal: DestinationGoal }
      setGoals((prev) => [...prev, goal])
      setInput('')
      setAdding(false)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Complete ───────────────────────────────────────────────────────────────

  async function handleComplete(id: string) {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/goals/destination', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, status: 'completed' }),
      })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        setError(json.error ?? 'Failed to update goal.')
        return
      }
      setGoals((prev) => prev.filter((g) => g.id !== id))
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Release ────────────────────────────────────────────────────────────────

  async function handleRelease(id: string) {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/goals/destination', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, status: 'released' }),
      })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        setError(json.error ?? 'Failed to remove goal.')
        return
      }
      setGoals((prev) => prev.filter((g) => g.id !== id))
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mt-3 pt-3 border-t border-white/20">
      <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
        Destination Goals
      </p>

      {/* Goal list */}
      {goals.length > 0 && (
        <ul className="space-y-2 mb-2">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className="flex items-start gap-2 bg-white/10 rounded-lg px-3 py-2"
            >
              {/* Complete checkbox */}
              <button
                type="button"
                onClick={() => handleComplete(goal.id)}
                disabled={saving}
                className="shrink-0 mt-0.5 w-4 h-4 rounded border border-white/40 bg-transparent hover:border-white/80 transition-colors flex items-center justify-center"
                aria-label="Mark as completed"
              />

              {/* Goal text */}
              <span className="flex-1 text-sm text-white/90 leading-snug">
                {goal.goal_text}
              </span>

              {/* Release button */}
              <button
                type="button"
                onClick={() => handleRelease(goal.id)}
                disabled={saving}
                className="shrink-0 text-white/30 hover:text-white/70 transition-colors mt-0.5"
                aria-label="Release goal"
              >
                <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="13" y2="13" />
                  <line x1="13" y1="1" x2="1" y2="13" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add input */}
      {adding ? (
        <div className="space-y-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            placeholder="Describe your destination goal…"
            className="w-full rounded-lg px-3 py-2.5 text-sm bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50 transition-colors"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!inputText.trim() || saving}
              className={[
                'flex-1 py-2 rounded-lg text-xs font-semibold transition-colors',
                inputText.trim() && !saving
                  ? 'bg-white text-slate-800 hover:bg-white/90'
                  : 'bg-white/20 text-white/40 cursor-not-allowed',
              ].join(' ')}
            >
              {saving ? 'Saving…' : 'Add Goal'}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setInput('') }}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : atCap ? (
        <p className="text-xs text-white/50 text-center py-1">
          Goal cap reached ({cap} destination goal{cap !== 1 ? 's' : ''} max at this level).
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full py-2 rounded-lg text-xs font-semibold text-white/70 hover:text-white border border-white/20 hover:border-white/40 transition-colors"
        >
          + Add Destination Goal
        </button>
      )}

      {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
    </div>
  )
}
