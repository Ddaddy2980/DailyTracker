'use client'

import { useState } from 'react'
import { PILLAR_GOAL_EMOJI, DEFAULT_GOAL_EMOJI, deriveGoalLabel, GOAL_LABEL_MAX } from '@/lib/constants'
import type { PillarName, GoalDraft, GoalSuggestion } from '@/lib/types'
import ACTChecklist, { type ACTState } from '@/components/goals/ACTChecklist'
import GoalSuggestions from '@/components/goals/GoalSuggestions'

interface GoalInputRowProps {
  pillar:   PillarName
  onAdd:    (draft: GoalDraft) => void
  onCancel: () => void
}

const EMPTY_ACT: ACTState = { a: false, c: false, t: false }
const ALL_CHECKED: ACTState = { a: true, c: true, t: true }

export default function GoalInputRow({ pillar, onAdd, onCancel }: GoalInputRowProps) {
  const [text, setText]   = useState('')
  const [label, setLabel] = useState('')
  const [labelEdited, setLabelEdited] = useState(false)
  const [icon, setIcon]   = useState<string>(DEFAULT_GOAL_EMOJI[pillar])
  const [act, setAct]     = useState<ACTState>(EMPTY_ACT)

  const allActChecked = act.a && act.c && act.t
  const canAdd        = text.trim().length > 0 && allActChecked

  // Label mirrors the text (truncated) until the user edits it directly.
  const effectiveLabel = labelEdited ? label : deriveGoalLabel(text)

  function handleTextChange(value: string) {
    setText(value)
  }

  function handleSuggestionSelect(s: GoalSuggestion) {
    setText(s.text)
    setLabel(s.label)
    setLabelEdited(true)
    setIcon(s.icon)
    setAct(ALL_CHECKED)
  }

  function handleAdd() {
    if (!canAdd) return
    const finalLabel = (effectiveLabel.trim() || deriveGoalLabel(text)).slice(0, GOAL_LABEL_MAX)
    onAdd({ text: text.trim(), label: finalLabel, icon })
    setText('')
    setLabel('')
    setLabelEdited(false)
    setIcon(DEFAULT_GOAL_EMOJI[pillar])
    setAct(EMPTY_ACT)
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      {/* Text input */}
      <input
        type="text"
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="Describe your goal…"
        className="w-full rounded-lg px-3 py-2.5 text-sm bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50 transition-colors"
        autoFocus
      />

      {/* Suggestions */}
      <GoalSuggestions pillar={pillar} onSelect={handleSuggestionSelect} />

      {/* Icon picker — shown on the dashboard ring */}
      <div className="mt-3">
        <p className="text-[11px] text-white/50 mb-1.5">Pick an icon</p>
        <div className="flex flex-wrap gap-1.5">
          {PILLAR_GOAL_EMOJI[pillar].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              aria-label={`Choose icon ${emoji}`}
              aria-pressed={icon === emoji}
              className={[
                'flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors',
                icon === emoji
                  ? 'bg-white/90 ring-2 ring-white'
                  : 'bg-white/10 hover:bg-white/20',
              ].join(' ')}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Short label — what shows under the ring */}
      <div className="mt-3">
        <label className="block text-[11px] text-white/50 mb-1.5">
          Short label ({effectiveLabel.length}/{GOAL_LABEL_MAX})
        </label>
        <input
          type="text"
          value={effectiveLabel}
          maxLength={GOAL_LABEL_MAX}
          onChange={(e) => { setLabel(e.target.value); setLabelEdited(true) }}
          placeholder="e.g. Workout"
          className="w-full rounded-lg px-3 py-2 text-sm bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/50 transition-colors"
        />
      </div>

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
