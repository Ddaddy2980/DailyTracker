'use client'

import { useState } from 'react'
import Image from 'next/image'
import { PILLAR_CONFIG, LEVEL_NAMES, rollingWindowDates, selectTuningVideo } from '@/lib/constants'
import type { PillarLevel, DurationGoal, PillarDailyEntry, GoalCompletions, DayMark, PulseState } from '@/lib/types'
import VideoModal from '@/components/shared/VideoModal'
import { usePillarSave } from '@/hooks/usePillarSave'
import ChevronIcon from '@/components/ui/ChevronIcon'
import PlayIcon from '@/components/ui/PlayIcon'

interface TuningPillarCardProps {
  pillarLevel: PillarLevel
  goals: DurationGoal[]
  todayEntry: PillarDailyEntry | null
  windowEntries: PillarDailyEntry[]
  challengeId: string
  challengeStartDate: string
  userId: string
  entryDate: string
  dayNumber: number
  pulseState: PulseState
}

function buildDots(
  entryByDate: Map<string, PillarDailyEntry>,
  challengeStartDate: string,
  isCompletedToday: boolean,
  entryDate: string,
): DayMark[] {
  const dates = rollingWindowDates(7, entryDate)
  const lastDate = dates[dates.length - 1]

  return dates.map((date) => {
    // Days before the challenge started are not applicable
    if (date < challengeStartDate) return 'future'

    // Optimistic update: mark the viewing date as completed if all goals are checked
    if (date === lastDate && isCompletedToday) return 'completed'

    const entry = entryByDate.get(date)
    return entry?.completed === true ? 'completed' : 'missed'
  })
}

export default function TuningPillarCard({
  pillarLevel,
  goals,
  todayEntry,
  windowEntries,
  challengeId,
  challengeStartDate,
  entryDate,
  dayNumber,
  pulseState,
}: TuningPillarCardProps) {
  const { pillar, level } = pillarLevel
  const config = PILLAR_CONFIG[pillar]

  const [isOpen, setIsOpen] = useState(false)
  const [completions, setCompletions] = useState<GoalCompletions>(() => {
    return todayEntry?.goal_completions ?? {}
  })
  const { saving, saved, saveError, advancedToLevel, handleSave } = usePillarSave(
    pillar, challengeId, entryDate, () => setIsOpen(false),
  )
  const [showVideo, setShowVideo] = useState(false)
  const [videoWatched, setVideoWatched] = useState(false)

  // Pre-index window entries for O(1) date lookups
  const entryByDate = new Map<string, PillarDailyEntry>()
  for (const e of windowEntries) entryByDate.set(e.entry_date, e)

  // Compute stalled days for video selection (days missed in last 3)
  const recentDates = rollingWindowDates(3, entryDate)
  const stalledDays = recentDates.filter((date) => {
    const entry = entryByDate.get(date)
    return !entry?.completed
  }).length

  const video = selectTuningVideo(pillar, dayNumber, stalledDays)

  const isCompletedToday =
    goals.length > 0 && goals.every((g) => completions[g.id] === true)

  const dots = buildDots(entryByDate, challengeStartDate, isCompletedToday, entryDate)
  const completedInWindow = dots.filter((d) => d === 'completed').length
  const applicableDays = dots.filter((d) => d !== 'future').length

  function toggleGoal(goalId: string) {
    setCompletions((prev) => ({ ...prev, [goalId]: !prev[goalId] }))
  }

  const saveLabel = saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'

  return (
    <>
    {showVideo && (
      <VideoModal
        video={video}
        onClose={() => setShowVideo(false)}
        onWatched={() => setVideoWatched(true)}
      />
    )}
    <div className="rounded-xl overflow-hidden shadow-sm">
      {/* Collapsed header row — always visible */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 p-4"
        style={{ backgroundColor: config.background }}
        aria-expanded={isOpen}
      >
        <Image
          src={config.icon}
          alt={config.label}
          width={28}
          height={28}
          className="flex-shrink-0"
        />

        <div className="flex-1 text-left">
          <p className="font-semibold leading-tight" style={{ color: config.title }}>
            {config.label}
          </p>
          <p className="text-sm" style={{ color: config.subtitle }}>
            {LEVEL_NAMES[level]}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Video button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowVideo(true) }}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            aria-label="Watch coaching video"
          >
            {videoWatched ? (
              <span className="text-emerald-300 text-sm leading-none">✓</span>
            ) : (
              <PlayIcon className="w-3.5 h-3.5 text-white ml-0.5" />
            )}
          </button>
          {isCompletedToday && (
            <span className="text-emerald-400 text-lg leading-none">✓</span>
          )}
          <ChevronIcon className={`w-5 h-5 text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div
          className="px-4 pb-4 pt-0"
          style={{ backgroundColor: config.background }}
        >
          <div className="border-t mt-0 pt-3" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
            {/* Advancement toast — replaces content when level-up fires */}
            {advancedToLevel !== null ? (
              <div className="py-4 text-center">
                <p className="font-semibold mb-1" style={{ color: config.title }}>
                  You&apos;ve advanced to {LEVEL_NAMES[advancedToLevel]}!
                </p>
                <p className="text-sm" style={{ color: config.subtitle }}>
                  Your dashboard is updating…
                </p>
              </div>
            ) : (
            <>
            {/* Duration goals */}
            {goals.length === 0 ? (
              <p className="text-sm italic mb-3" style={{ color: config.subtitle }}>
                No duration goals set yet.
              </p>
            ) : (
              <ul className="space-y-2 mb-3">
                {goals.map((goal) => (
                  <li key={goal.id} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`goal-${goal.id}`}
                      checked={completions[goal.id] ?? false}
                      onChange={() => toggleGoal(goal.id)}
                      className="mt-0.5 h-4 w-4 rounded border-2 border-white bg-transparent flex-shrink-0 cursor-pointer accent-white"
                    />
                    <label
                      htmlFor={`goal-${goal.id}`}
                      className="text-sm leading-snug cursor-pointer"
                      style={{ color: config.title }}
                    >
                      {goal.goal_text}
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {/* 7-day rolling window dot visualization */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: config.subtitle }}>
                  Last 7 days
                </span>
                <span className="text-xs" style={{ color: config.subtitle }}>
                  {completedInWindow} of {applicableDays}
                </span>
              </div>
              <div className="flex gap-2">
                {dots.map((mark, i) => (
                  <span
                    key={i}
                    role="img"
                    aria-label={`Day ${i + 1}: ${mark}`}
                    className="w-5 h-5 rounded-full flex-shrink-0"
                    style={
                      mark === 'completed'
                        ? { backgroundColor: config.title }
                        : mark === 'missed'
                        ? {
                            backgroundColor: 'transparent',
                            border: `2px solid ${config.subtitle}`,
                          }
                        : {
                            backgroundColor: 'transparent',
                            border: `2px solid ${config.subtitle}`,
                            opacity: 0.25,
                          }
                    }
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSave(completions)}
              disabled={saving}
              className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-70"
              style={{ backgroundColor: config.saveButton }}
            >
              {saveLabel}
            </button>

            {saveError && (
              <p className="text-red-400 text-xs mt-2 text-center">{saveError}</p>
            )}
            </>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  )
}
