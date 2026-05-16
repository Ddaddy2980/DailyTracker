'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PillarName, GoalCompletions, LevelNumber, CheckinApiResponse } from '@/lib/types'

export function usePillarSave(
  pillar:      PillarName,
  challengeId: string,
  entryDate:   string,
  onSuccess?:  () => void,
) {
  const router = useRouter()
  const [saving, setSaving]                   = useState(false)
  const [saved, setSaved]                     = useState(false)
  const [saveError, setSaveError]             = useState<string | null>(null)
  const [advancedToLevel, setAdvancedToLevel] = useState<LevelNumber | null>(null)

  async function handleSave(completedGoals: GoalCompletions) {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/checkin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pillar,
          challengeId,
          goalCompletions: completedGoals,
          entry_date:      entryDate,
        }),
      })
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string }
        setSaveError(errData.error ?? 'Save failed. Please try again.')
        return
      }
      const data = (await res.json()) as CheckinApiResponse
      if (data.advanced && data.newLevel) {
        // Advancement: don't refresh yet — the celebration modal needs to stay
        // mounted until the user dismisses it. Refresh is deferred to
        // dismissAdvancement() below.
        setAdvancedToLevel(data.newLevel)
      } else {
        setSaved(true)
        onSuccess?.()
        router.refresh()
        // ~1s illumination on the card, then fade back to normal.
        setTimeout(() => setSaved(false), 1200)
      }
    } catch {
      setSaveError('Could not reach the server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function dismissAdvancement() {
    setAdvancedToLevel(null)
    router.refresh()
  }

  return { saving, saved, saveError, advancedToLevel, handleSave, dismissAdvancement }
}
