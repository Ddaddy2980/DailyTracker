import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getUserProfile } from '@/app/actions'

// ─── Level routing hub ────────────────────────────────────────────────────────
// Every authenticated visit resolves here first.
// Routing rules (per PRODUCT.md):
//   no user_profile row   → create one → /onboarding
//   onboarding_completed = false → /onboarding
//   current_level = 1     → /dashboard  (Step 4 will change to /challenge)
//   current_level > 1     → /dashboard  (future: level-appropriate routes)

export default async function Home() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const profile = await getUserProfile()

  // Profile creation failed (DB error) — fall back to dashboard rather than loop
  if (!profile) redirect('/dashboard')

  if (!profile.onboarding_completed) redirect('/onboarding')

  // Level 1 users go to the Starter experience.
  // /challenge will replace this in Step 4 once the 7-day view is built.
  if (profile.current_level === 1) redirect('/dashboard')

  // Levels 2–5: route to their experience (future steps).
  redirect('/dashboard')
}
