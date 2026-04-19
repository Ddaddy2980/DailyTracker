'use client'

import { useState } from 'react'
import { DURATION_GOAL_SUGGESTIONS } from '@/lib/constants'
import type { PillarName } from '@/lib/types'

interface GoalSuggestionsProps {
  pillar:    PillarName
  onSelect:  (text: string) => void
}

export default function GoalSuggestions({ pillar, onSelect }: GoalSuggestionsProps) {
  const [open, setOpen] = useState(false)
  const suggestions = DURATION_GOAL_SUGGESTIONS[pillar]

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-white/60 hover:text-white/90 transition-colors flex items-center gap-1"
      >
        <svg
          viewBox="0 0 10 6"
          className={['w-2.5 h-2.5 transition-transform', open ? 'rotate-180' : ''].join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 1l4 4 4-4" />
        </svg>
        {open ? 'Hide suggestions' : 'See suggestions'}
      </button>

      {open && (
        <ul className="mt-2 space-y-1.5">
          {suggestions.map((text) => (
            <li key={text}>
              <button
                type="button"
                onClick={() => {
                  onSelect(text)
                  setOpen(false)
                }}
                className="w-full text-left text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition-colors"
              >
                {text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
