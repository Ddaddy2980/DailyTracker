'use client'

import { useState } from 'react'
import HistoryWeekGrid from './HistoryWeekGrid'
import HistoryMonthGrid from './HistoryMonthGrid'
import HistoryProgressReport from './HistoryProgressReport'
import type { PillarLevel, DurationGoal, PillarDailyEntry } from '@/lib/types'

type Tab = 'week' | 'month' | 'progress'

interface HistoryTabsProps {
  weekStart: string
  challengeStartDate: string
  allEntries: PillarDailyEntry[]
  activePillarLevels: PillarLevel[]
  activeGoals: DurationGoal[]
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'progress', label: 'Progress' },
]

export default function HistoryTabs({
  weekStart,
  challengeStartDate,
  allEntries,
  activePillarLevels,
  activeGoals,
}: HistoryTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('week')

  return (
    <div>
      <div className="flex bg-white rounded-xl shadow-sm overflow-hidden mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-700 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'week' && (
        <HistoryWeekGrid
          weekStart={weekStart}
          challengeStartDate={challengeStartDate}
          allEntries={allEntries}
          activePillarLevels={activePillarLevels}
          activeGoals={activeGoals}
        />
      )}
      {activeTab === 'month' && (
        <HistoryMonthGrid
          challengeStartDate={challengeStartDate}
          allEntries={allEntries}
          activeGoals={activeGoals}
        />
      )}
      {activeTab === 'progress' && (
        <HistoryProgressReport
          challengeStartDate={challengeStartDate}
          allEntries={allEntries}
          activeGoals={activeGoals}
          activePillarLevels={activePillarLevels}
        />
      )}
    </div>
  )
}
