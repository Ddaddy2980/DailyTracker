'use client'

interface Props {
  onNext: () => void
  onBack: () => void
}

export default function StepRollercoaster({ onNext, onBack }: Props) {
  return (
    <div className="flex flex-col gap-7 pt-8">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-400">
          Before you set your goal
        </p>
        <h2 className="text-2xl font-black leading-snug">
          Why most goals fail before they start
        </h2>
      </div>

      <div className="bg-red-950 border border-red-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⛔</span>
          <span className="font-bold text-red-300">Destination Goals</span>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          &ldquo;Run a marathon.&rdquo; &ldquo;Lose 20 lbs.&rdquo; These target an{' '}
          <em>endpoint</em>. You push to arrive — then drift back.
          That&apos;s the <strong className="text-white">Rollercoaster Effect</strong>.
        </p>
        <div className="flex items-center gap-1 pt-1">
          {['Begin', 'Endure', 'Arrive', '↩ Return'].map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1 last:flex-none">
              <span className={`text-xs whitespace-nowrap ${i === 3 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                {label}
              </span>
              {i < 3 && <div className="flex-1 border-t border-dashed border-slate-600" />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-emerald-950 border border-emerald-700 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✅</span>
          <span className="font-bold text-emerald-300">Duration Goals</span>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          &ldquo;Walk 20 minutes every day.&rdquo; These target{' '}
          <em>consistency over time</em>. No finish line — just the daily
          habit. Over time, the habit becomes who you are.
        </p>
        <div className="flex items-center gap-1 pt-1">
          {['Day 1', 'Day 7', 'Day 30', '→ Life'].map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1 last:flex-none">
              <span className={`text-xs whitespace-nowrap ${i === 3 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                {label}
              </span>
              {i < 3 && <div className="flex-1 border-t border-emerald-700" />}
            </div>
          ))}
        </div>
      </div>

      <p className="text-slate-400 text-sm text-center leading-relaxed">
        Every goal in this app is a{' '}
        <strong className="text-white">duration goal</strong>.
        You&apos;re not chasing an endpoint. You&apos;re building a life.
      </p>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors"
        >
          ←
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-colors"
        >
          Set my goal →
        </button>
      </div>
    </div>
  )
}
