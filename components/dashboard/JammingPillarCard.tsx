'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PILLAR_CONFIG, LEVEL_NAMES, rollingWindowDates, selectJammingVideo } from '@/lib/constants'
import type { PillarLevel, DurationGoal, PillarDailyEntry, GoalCompletions, DayMark, LevelNumber, PulseState } from '@/lib/types'
import VideoModal from '@/components/shared/VideoModal'

interface CheckinApiResponse {
  success: boolean
  completed: boolean
  advanced: boolean
  newLevel: LevelNumber | null
}

interface JammingPillarCardProps {
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
  windowEntries: PillarDailyEntry[],
  challengeStartDate: string,
  isCompletedToday: boolean,
  entryDate: string,
): DayMark[] {
  const dates = rollingWindowDates(14, entryDate)
  const lastDate = dates[dates.length - 1]

  return dates.map((date) => {
    if (date < challengeStartDate) return 'future'
    if (date === lastDate && isCompletedToday) return 'completed'
    const entry = windowEntries.find((e) => e.entry_date === date)
    return entry?.completed === true ? 'completed' : 'missed'
  })
}

interface DotRowProps {
  dots: DayMark[]
  titleColor: string
  subtitleColor: string
}

function DotRow({ dots, titleColor, subtitleColor }: DotRowProps) {
  return (
    <div className="flex gap-2">
      {dots.map((mark, i) => (
        <span
          key={i}
          className="w-5 h-5 rounded-full flex-shrink-0"
          style={
            mark === 'completed'
              ? { backgroundColor: titleColor }
              : mark === 'missed'
              ? { backgroundColor: 'transparent', border: `2px solid ${subtitleColor}` }
              : { backgroundColor: 'transparent', border: `2px solid ${subtitleColor}`, opacity: 0.25 }
          }
        />
      ))}
    </div>
  )
}

export default function JammingPillarCard({
  pillarLevel,
  goals,
  todayEntry,
  windowEntries,
  challengeId,
  challengeStartDate,
  entryDate,
  pulseState,
}: JammingPillarCardProps) {
  const { pillar, level } = pillarLevel
  const config = PILLAR_CONFIG[pillar]
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [completions, setCompletions] = useState<GoalCompletions>(() => {
    return todayEntry?.goal_completions ?? {}
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [advancedToLevel, setAdvancedToLevel] = useState<LevelNumber | null>(null)
  const [showVideo, setShowVideo] = useState(false)
  const [videoWatched, setVideoWatched] = useState(false)

  const video = selectJammingVideo(pulseState)

  const isCompletedToday =
    goals.length > 0 && goals.every((g) => completions[g.id] === true)

  const dots = buildDots(windowEntries, challengeStartDate, isCompletedToday, entryDate)
  const topRow = dots.slice(0, 7)
  const bottomRow = dots.slice(7, 14)
  const completedInWindow = dots.filter((d) => d === 'completed').length
  const applicableDays = dots.filter((d) => d !== 'future').length

  function toggleGoal(goalId: string) {
    setCompletions((prev) => ({ ...prev, [goalId]: !prev[goalId] }))
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pillar,
        challengeId,
        goalCompletions: completions,
        entry_date: entryDate,
      }),
    })
    const data = (await res.json()) as CheckinApiResponse
    setSaving(false)

    if (data.advanced && data.newLevel) {
      setAdvancedToLevel(data.newLevel)
      setTimeout(() => router.refresh(), 2500)
    } else {
      setSaved(true)
      setIsOpen(false)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    }
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
              <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          {isCompletedToday && (
            <span className="text-emerald-400 text-lg leading-none">✓</span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="white"
            className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
              clipRule="evenodd"
            />
          </svg>
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

            {/* 14-day rolling window dot visualization — 2 rows of 7 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: config.subtitle }}>
                  Last 14 days
                </span>
                <span className="text-xs" style={{ color: config.subtitle }}>
                  {completedInWindow} of {applicableDays}
                </span>
              </div>
              <div className="space-y-1.5">
                <DotRow dots={topRow} titleColor={config.title} subtitleColor={config.subtitle} />
                <DotRow dots={bottomRow} titleColor={config.title} subtitleColor={config.subtitle} />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-70"
              style={{ backgroundColor: config.saveButton }}
            >
              {saveLabel}
            </button>
            </>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  )
}
