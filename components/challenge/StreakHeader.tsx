'use client'

interface Props {
  dayNumber:        number
  streak:           number
  purposeStatement: string | null
  todayComplete:    boolean
}

const MILESTONE: Record<number, string> = {
  1: 'Day 1 — Start',
  2: 'Day 2 — Adapt',
  3: 'Day 3 — Hard Day',
  4: 'Day 4 — Halfway',
  5: 'Day 5 — Notice',
  6: 'Day 6 — Almost',
  7: 'Day 7 — Done',
}

export default function StreakHeader({ dayNumber, streak, purposeStatement, todayComplete }: Props) {
  const isHardDay = dayNumber === 3

  return (
    <div className="space-y-3">
      {/* Day label + streak */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-purple-400">
            7-Day Challenge
          </p>
          <h1 className="text-2xl font-black text-white mt-0.5">
            {MILESTONE[dayNumber] ?? `Day ${dayNumber}`}
          </h1>
        </div>

        {streak > 0 && (
          <div className="flex flex-col items-center bg-slate-800 rounded-2xl px-4 py-2">
            <span className="text-2xl font-black text-amber-400">{streak}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {streak === 1 ? 'day' : 'days'} done
            </span>
          </div>
        )}
      </div>

      {/* Streak dots */}
      <div className="flex gap-1.5">
        {Array.from({ length: 7 }, (_, i) => {
          const day = i + 1
          const isDone   = day < dayNumber && streak >= day   // simplified: filled if before today and within streak count
          const isToday  = day === dayNumber
          return (
            <div
              key={day}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                todayComplete && isToday ? 'bg-emerald-500' :
                isToday                  ? 'bg-purple-500' :
                isDone                   ? 'bg-purple-700' :
                                           'bg-slate-700'
              }`}
            />
          )
        })}
      </div>

      {/* Purpose reminder on Day 3 — the hardest day */}
      {isHardDay && purposeStatement && (
        <div className="bg-purple-950 border border-purple-800 rounded-xl p-4 mt-1">
          <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">
            Remember why you started
          </p>
          <p className="text-slate-200 text-sm italic">&ldquo;{purposeStatement}&rdquo;</p>
        </div>
      )}

      {/* Today complete banner */}
      {todayComplete && (
        <div className="bg-emerald-950 border border-emerald-700 rounded-xl p-3 flex items-center gap-2">
          <span className="text-lg">✅</span>
          <span className="text-emerald-300 font-bold text-sm">
            {dayNumber === 7 ? 'Challenge complete! Day 7 done.' : 'Today is done. See you tomorrow.'}
          </span>
        </div>
      )}
    </div>
  )
}
