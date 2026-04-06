'use client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  question:       string
  answer:         string
  onAnswerChange: (v: string) => void
  onContinue:     () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WeeklyReflectionQuestionStep({ question, answer, onAnswerChange, onContinue }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Reflect</p>
        <p className="text-white font-bold text-base leading-snug">{question}</p>
      </div>

      <textarea
        value={answer}
        onChange={e => onAnswerChange(e.target.value)}
        placeholder="Take a moment… there's no wrong answer."
        rows={4}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white
          placeholder-slate-500 resize-none focus:outline-none focus:border-violet-500 transition-colors"
      />

      <button
        onClick={onContinue}
        className="w-full py-3 bg-violet-700 hover:bg-violet-600 text-white font-bold rounded-2xl transition-colors"
      >
        {answer.trim() ? 'Continue →' : 'Skip →'}
      </button>
    </div>
  )
}
