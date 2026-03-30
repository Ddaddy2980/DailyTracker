'use client'

// FocusExercise — the 25/5 focus exercise UI.
// Two stages: write up to 25 items, then rank the top 5.
// This component is presentation-only — the caller handles saving.
// Used in: GroovingStep2Focus (onboarding) and FocusExerciseModal (dashboard).

import { useState } from 'react'
import type { FocusTop5Item } from '@/lib/types'

interface Props {
  onComplete: (data: { focusList25: string[]; focusTop5: FocusTop5Item[] }) => void
  onSkip:     () => void
  onBack?:    () => void     // shown in Stage 1 only when provided (onboarding back button)
  isPending?: boolean
}

export default function FocusExercise({ onComplete, onSkip, onBack, isPending }: Props) {
  const [stage, setStage] = useState<'write' | 'rank'>('write')
  const [items, setItems] = useState<string[]>(Array(5).fill(''))
  const [ranked, setRanked] = useState<string[]>([])

  // ── Stage 1 logic ────────────────────────────────────────────────────────────

  function handleItemChange(i: number, value: string) {
    setItems(prev => {
      const next = [...prev]
      next[i] = value
      // When the last visible field receives input, reveal one more (up to 25)
      if (i === next.length - 1 && value.trim().length > 0 && next.length < 25) {
        next.push('')
      }
      return next
    })
  }

  const filledItems  = items.filter(s => s.trim().length > 0)
  const canContinue  = filledItems.length >= 5

  function goToRank() {
    const valid = items.filter(s => s.trim().length > 0)
    setRanked(valid.length === 5 ? [...valid] : [])
    setStage('rank')
  }

  // ── Stage 2 logic ────────────────────────────────────────────────────────────

  const validItems   = items.filter(s => s.trim().length > 0)
  const isAutoSelect = validItems.length === 5   // skip ranking interaction

  function toggleRank(item: string) {
    setRanked(prev =>
      prev.includes(item) ? prev.filter(r => r !== item)
      : prev.length < 5   ? [...prev, item]
      : prev
    )
  }

  function moveUp(i: number) {
    if (i === 0) return
    setRanked(prev => { const n = [...prev]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n })
  }

  function moveDown(i: number) {
    if (i === ranked.length - 1) return
    setRanked(prev => { const n = [...prev]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n })
  }

  const canSave = isAutoSelect || ranked.length === 5

  function handleSave() {
    onComplete({
      focusList25: validItems,
      focusTop5:   ranked.map((text, i) => ({ rank: i + 1, text })),
    })
  }

  // ── Stage 1: write ───────────────────────────────────────────────────────────

  if (stage === 'write') {
    const EXAMPLES = ['Learn to play piano', 'Start a business', 'Run a half marathon']
    return (
      <div className="flex flex-col gap-5 pt-8">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-400">The 25/5 Exercise</p>
          <h2 className="text-2xl font-black leading-tight">What do you want to accomplish?</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Write up to 25 things you want in the next 2–5 years. Don&apos;t filter yourself.
          </p>
        </div>

        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-slate-600 text-xs font-mono w-5 text-right shrink-0 select-none">
                {i + 1}
              </span>
              <input
                type="text"
                value={item}
                onChange={e => handleItemChange(i, e.target.value)}
                placeholder={i < 3 ? `e.g. ${EXAMPLES[i]}` : ''}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm
                  placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500 text-center">
          {filledItems.length} item{filledItems.length !== 1 ? 's' : ''}{' '}
          <span className="text-slate-600">— 5 minimum, 25 maximum</span>
        </p>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Why this matters</p>
          <p className="text-slate-300 text-sm leading-relaxed">
            Your top five are your focus. The other twenty will keep you from your top five
            if you let them. This list becomes the reference for your destination goals.
          </p>
        </div>

        <button
          onClick={goToRank}
          disabled={!canContinue}
          className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800
            disabled:text-slate-500 disabled:cursor-not-allowed rounded-2xl font-black
            text-lg transition-colors"
        >
          Continue to Step 2 →
        </button>

        <div className="flex gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex-1 py-3 text-slate-400 hover:text-slate-300 text-sm text-center transition-colors"
            >
              ← Back
            </button>
          )}
          <button
            onClick={onSkip}
            className="flex-1 py-3 text-slate-500 hover:text-slate-400 text-sm text-center transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  // ── Stage 2: rank ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 pt-8">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
          Step 2 — {isAutoSelect ? 'Your Top 5' : 'Circle Your Top 5'}
        </p>
        <h2 className="text-2xl font-black leading-tight">
          {isAutoSelect ? 'These are your top 5.' : 'Which five matter most?'}
        </h2>
        <p className="text-slate-400 text-sm">
          {isAutoSelect
            ? 'You can reorder them if you\'d like.'
            : 'Tap to select in order of importance. Everything you set aside stays visible.'}
        </p>
      </div>

      {/* Auto-select path (exactly 5 items): ranked list with reorder controls */}
      {isAutoSelect && (
        <div className="space-y-2">
          {ranked.map((item, i) => (
            <div
              key={item}
              className="flex items-center gap-3 bg-violet-950/40 border border-violet-700 rounded-xl px-4 py-3"
            >
              <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-white leading-snug">{item}</span>
              <div className="flex flex-col gap-px">
                <button onClick={() => moveUp(i)} disabled={i === 0}
                  className="text-slate-500 hover:text-slate-300 disabled:opacity-20 transition-colors text-xs leading-tight"
                  aria-label="Move up">▲</button>
                <button onClick={() => moveDown(i)} disabled={i === ranked.length - 1}
                  className="text-slate-500 hover:text-slate-300 disabled:opacity-20 transition-colors text-xs leading-tight"
                  aria-label="Move down">▼</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selection path (6+ items): full selectable list with dimming */}
      {!isAutoSelect && (
        <div className="space-y-2">
          {validItems.map((item, i) => {
            const rankIdx  = ranked.indexOf(item)
            const isRanked = rankIdx >= 0
            const isMaxed  = ranked.length >= 5 && !isRanked
            return (
              <button
                key={i}
                onClick={() => toggleRank(item)}
                disabled={isMaxed}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all
                  ${isRanked
                    ? 'border-violet-500 bg-violet-950/40 text-white'
                    : isMaxed
                    ? 'border-slate-800 bg-slate-900/30 text-slate-600 opacity-50 cursor-default'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                  }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0
                  ${isRanked ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                  {isRanked ? rankIdx + 1 : '·'}
                </span>
                <span className="text-sm leading-snug">{item}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Confirmation summary for 6+ items once 5 are selected */}
      {!isAutoSelect && ranked.length === 5 && (
        <div className="bg-violet-950 border border-violet-700 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Your top 5</p>
          <ol className="space-y-1">
            {ranked.map((item, i) => (
              <li key={i} className="text-sm text-white flex gap-2">
                <span className="text-violet-400 font-black shrink-0">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={isPending || !canSave}
        className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800
          disabled:text-slate-500 disabled:cursor-not-allowed rounded-2xl font-black
          text-lg transition-colors"
      >
        {isPending ? 'Saving…'
          : canSave ? 'Save My Top 5 →'
          : `Select ${5 - ranked.length} more`}
      </button>

      <button
        onClick={() => setStage('write')}
        className="w-full py-2 text-slate-500 text-sm hover:text-slate-400 transition-colors text-center"
      >
        ← Back to list
      </button>
    </div>
  )
}
