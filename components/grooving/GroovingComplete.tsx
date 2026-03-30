'use client'

// Step 30 will replace this with the full Grooving completion sequence:
// badge, stats, habit calendar summary, 25/5 review, destination goal status, Soloing invitation.

interface Props {
  daysCompleted:   number
  durationDays:    number
  consistencyPct:  number
  pillars:         string[]
  soloingEligible: boolean
}

export default function GroovingComplete({
  daysCompleted, durationDays, consistencyPct, pillars, soloingEligible,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm space-y-5 text-center">

        <div className="text-6xl">🎵</div>
        <h1 className="text-3xl font-black text-white">Grooving complete.</h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          {daysCompleted} of {durationDays} days · {pillars.length} pillars · {consistencyPct}% consistency
        </p>

        {soloingEligible && (
          <div className="bg-violet-950 border border-violet-700 rounded-2xl p-4">
            <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-1">Soloing Unlocked</p>
            <p className="text-white text-sm">
              You&apos;ve met the criteria. The full completion sequence and Soloing invitation are coming in Step 30.
            </p>
          </div>
        )}

        {!soloingEligible && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
            <p className="text-slate-400 text-sm leading-relaxed">
              To unlock Soloing, complete a Grooving challenge of 60+ days with 80%+ consistency.
            </p>
          </div>
        )}

        <p className="text-slate-600 text-xs">Full completion sequence coming in Step 30.</p>

      </div>
    </div>
  )
}
