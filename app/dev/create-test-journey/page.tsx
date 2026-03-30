import { notFound, redirect } from 'next/navigation'
import { createContinuousJourney } from '@/app/actions'

// Development-only test page.
// Navigating to this route creates a 30-day continuous journey and
// immediately redirects to /journey so the new architecture can be tested.
//
// notFound() in production means this route never responds with content.
// It does not appear in any nav — access it manually in dev only.
//
// Note: if an active challenge already exists for this user, Supabase will
// insert a second row. Clear the challenges table or abandon the existing
// challenge before using this page to avoid duplicate active challenges.

export default async function CreateTestJourneyPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  await createContinuousJourney({
    name:            'Test User',
    totalDays:       30,
    selectedPillars: ['spiritual', 'personal'],
    pillarGoals: {
      spiritual: 'Read one chapter of Scripture every day',
      personal:  'Write in a journal each morning',
    },
  })

  redirect('/journey')
}
