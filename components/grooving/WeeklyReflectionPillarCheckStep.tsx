'use client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  pillarCheckQuestion: string
  pillarCheckAnswer:   string
  onAnswerChange:      (v: string) => void
  isPending:           boolean
  onDone:              () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WeeklyReflectionPillarCheckStep({
  pillarCheckQuestion, pillarCheckAnswer, onAnswerChange, isPending, onDone,
}: Props) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-teal-400">Pillar Check</p>
        <p className="text-white font-bold text-base leading-snug">{pillarCheckQuestion}</p>
      </div>

      <textarea
        value={pillarCheckAnswer}
        onChange={e => onAnswerChange(e.target.value)}
        placeholder="Take a moment to reflect…"
        rows={4}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white
          placeholder-slate-500 resize-none focus:outline-none focus:border-teal-500 transition-colors"
      />

      <button
        onClick={onDone}
        disabled={isPending}
        className="w-full py-3 bg-teal-700 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-bold text-white transition-colors"
      >
        {isPending ? 'Saving…' : pillarCheckAnswer.trim() ? 'Done →' : 'Skip →'}
      </button>
    </div>
  )
}
