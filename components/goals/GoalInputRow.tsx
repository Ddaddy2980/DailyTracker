'use client'

import { useState } from 'react'
import type { PillarName } from '@/lib/types'
import ACTChecklist, { type ACTState } from '@/components/goals/ACTChecklist'
import GoalSuggestions from '@/components/goals/GoalSuggestions'

interface GoalInputRowProps {
  pillar:   PillarName
  onAdd:    (text: string) => void
  onCancel: () => void
}

const EMPTY_ACT: ACTState = { a: false, c: false, t: false }
const ALL_CHECKED: ACTState = { a: true, c: true, t: true }

export default function GoalInputRow({ pillar, onAdd, onCancel }: GoalInputRowProps) {
  const [text, setText] = useState('')
  const [act, setAct]   = useState<ACTState>(EMPTY_ACT)

  const allActChecked = act.a && act.c && act.t
  const canAdd        = text.trim().length > 0 && allActChecked

  function handleSuggestionSelect(suggestion: string) {
    setText(suggestion)
    setAct(ALL_CHECKED)
  }

  function handleAdd() {
    if (!canAdd) return
    onAdd(text.trim())
    setText('')
    setAct(EMPTY_ACT)
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      {/* Text input */}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe your goal…"
        className="w-full rounded-lg px-3 py-2.5 text-sm bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50 transition-colors"
        autoFocus
      />

      {/* Suggestions */}
      <GoalSuggestions pillar={pillar} onSelect={handleSuggestionSelect} />

      {/* ACT checklist */}
      <ACTChecklist checked={act} onChange={setAct} />

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className={[
            'flex-1 py-2 rounded-lg text-xs font-semibold transition-colors',
            canAdd
              ? 'bg-white text-slate-800 hover:bg-white/90'
              : 'bg-white/20 text-white/40 cursor-not-allowed',
          ].join(' ')}
        >
          Add Goal
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-white/60 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
