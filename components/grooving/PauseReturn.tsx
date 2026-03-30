'use client'

// =============================================================================
// PauseReturn — Step 27, Part E
//
// Full-screen re-entry moment shown once on the first dashboard load after a
// pause ends (user-initiated resume or cron auto-resume).
//
// Shown when:
//   pauseStatus.isPaused === false
//   && pauseRecord.resumed_at !== null
//   && sessionStorage key 'pause_return_seen_<challengeId>' is not set
//
// sessionStorage flag is written on "Let's go" so the screen never repeats
// within the same browser session.
// =============================================================================

interface Props {
  challengeId:      string
  daysPaused:       number | null   // from challenge_pauses.days_paused; null = fallback to 1
  dayNumber:        number          // current challenge day number post-resume
  purposeStatement: string | null
  newEndDate:       string          // extended end_date — ISO date e.g. '2026-06-14'
  onDismiss:        () => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default function PauseReturn({
  challengeId, daysPaused, dayNumber, purposeStatement, newEndDate, onDismiss,
}: Props) {
  const days = daysPaused ?? 1

  function handleDismiss() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`pause_return_seen_${challengeId}`, '1')
    }
    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 pt-16 pb-10 flex flex-col min-h-full">

          {/* ── Headline ──────────────────────────────────────────────────────── */}
          <div className="space-y-1 mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-400">
              You&apos;re back
            </p>
            <h1 className="text-4xl font-black text-white tracking-tight">
              Welcome back.
            </h1>
          </div>

          {/* ── Pause summary ─────────────────────────────────────────────────── */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 mb-8">
            <p className="text-white font-semibold text-base leading-relaxed">
              {days} {days === 1 ? 'day' : 'days'} paused.{' '}
              Your challenge continues from Day {dayNumber}.
            </p>
            <p className="text-slate-400 text-sm">
              Your new finish date is{' '}
              <span className="text-white font-semibold">{formatDate(newEndDate)}</span>.
            </p>
          </div>

          {/* ── Purpose statement — why they started ─────────────────────────── */}
          <div className="flex-1 flex items-center justify-center py-8">
            {purposeStatement ? (
              <p className="font-serif text-white text-xl leading-relaxed text-center">
                &ldquo;{purposeStatement}&rdquo;
              </p>
            ) : (
              <p className="font-serif text-slate-400 text-xl leading-relaxed text-center italic">
                You haven&apos;t stopped. You paused.
              </p>
            )}
          </div>

          {/* ── CTA ───────────────────────────────────────────────────────────── */}
          <div className="pt-8">
            <button
              onClick={handleDismiss}
              className="w-full py-4 bg-violet-700 hover:bg-violet-600
                text-white font-bold rounded-2xl transition-colors text-base active:scale-95"
            >
              Let&apos;s go
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
