'use client'

interface Props {
  name:      string | null
  daysCount: number
  onDismiss: () => void
}

const SCRIPTURE = {
  verse: 'And let us not grow weary of doing good, for in due season we will reap, if we do not give up.',
  ref:   'Galatians 6:9',
}

export default function Day7Celebration({ name, daysCount, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm space-y-4">

        {/* ── Congratulations header ─────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-black text-white">
            {name ? `${name}, you did it.` : 'You did it.'}
          </h1>
          <p className="text-slate-400 text-sm">
            {daysCount === 7
              ? '7 days. Every one of them.'
              : `${daysCount} out of 7 days completed.`}
          </p>
        </div>

        {/* ── Starter badge ──────────────────────────────────────────────── */}
        <div className="bg-purple-950 border-2 border-purple-700 rounded-3xl p-6 text-center ring-4 ring-purple-500 ring-offset-4 ring-offset-slate-950">
          <div className="text-5xl mb-3">🏅</div>
          <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">
            Badge Earned
          </p>
          <h2 className="text-2xl font-black text-white">Starter</h2>
          <p className="text-purple-300 text-sm mt-1">Level 1 Complete</p>
        </div>

        {/* ── Scripture card ─────────────────────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
            A word for you
          </p>
          <p className="text-white text-base leading-relaxed italic mb-3">
            &ldquo;{SCRIPTURE.verse}&rdquo;
          </p>
          <p className="text-slate-400 text-sm font-semibold text-right">
            — {SCRIPTURE.ref}
          </p>
        </div>

        {/* ── Shareable card placeholder ─────────────────────────────────── */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
            </svg>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Shareable card</p>
          <p className="text-[11px] text-slate-600">Coming soon</p>
        </div>

        {/* ── Continue button ────────────────────────────────────────────── */}
        <button
          onClick={onDismiss}
          className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black text-lg text-white transition-colors"
        >
          Continue
        </button>

      </div>
    </div>
  )
}
