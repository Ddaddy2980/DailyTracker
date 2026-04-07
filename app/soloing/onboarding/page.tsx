import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getUserProfile, getActiveChallenge, getLastCompletedChallenge, getPillarLevels } from '@/app/actions'
import SoloingOnboardingFlow from './SoloingOnboardingFlow'

export default async function SoloingOnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [profile, activeChallenge] = await Promise.all([
    getUserProfile(),
    getActiveChallenge(),
  ])

  if (!profile || !profile.onboarding_completed) redirect('/onboarding')

  // Must be Level 4 to be here (promoted from Grooving)
  if (profile.current_level < 4) redirect('/grooving')

  // Re-fire gate: already have an active Level 4 challenge — go to the dashboard
  if (activeChallenge?.level === 4) redirect('/soloing')

  const [lastChallenge, pillarLevels] = await Promise.all([
    getLastCompletedChallenge(),
    getPillarLevels(),
  ])

  // Carry forward goals and pillar list from the last completed challenge (Grooving)
  const allPillars: string[] = lastChallenge
    ? Object.keys(lastChallenge.pillar_goals as Record<string, unknown>)
    : profile.selected_pillars

  const existingGoals: Record<string, string> = lastChallenge
    ? Object.fromEntries(
        Object.entries(lastChallenge.pillar_goals as Record<string, unknown>).map(([k, v]) => [k, String(v)])
      )
    : {}

  return (
    <SoloingOnboardingFlow
      allPillars={allPillars}
      existingGoals={existingGoals}
      pillarLevels={pillarLevels}
    />
  )
}
