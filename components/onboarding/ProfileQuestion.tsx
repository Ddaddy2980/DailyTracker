'use client'

import type { ProfileQuestion as ProfileQuestionType } from '@/lib/constants/consistencyProfileQuestions'

interface ProfileQuestionProps {
  question: ProfileQuestionType
  value: number | null
  onChange: (v: number) => void
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

export default function ProfileQuestion({ question, value, onChange }: ProfileQuestionProps) {
  return (
    <div className="mb-6">
      <p className="font-semibold text-slate-900 text-sm mb-1">{question.text}</p>
      <p className="text-xs text-slate-500 mb-3">{question.subText}</p>

      <div className="flex flex-col gap-2">
        {question.options.map((option, idx) => {
          const isSelected = value === idx
          return (
            <button
              key={idx}
              onClick={() => onChange(idx)}
              className={[
                'flex items-start gap-3 w-full rounded-lg border px-4 py-3 text-left transition-colors',
                isSelected
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
              ].join(' ')}
            >
              <span className={[
                'shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5',
                isSelected
                  ? 'border-white text-white'
                  : 'border-slate-300 text-slate-400',
              ].join(' ')}>
                {OPTION_LABELS[idx]}
              </span>
              <span className="text-sm leading-snug">{option}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
