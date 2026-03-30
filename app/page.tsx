import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getUserProfile, getActiveChallenge } from '@/app/actions'

// ─── Level routing hub ────────────────────────────────────────────────────────
// Every authenticated visit resolves here first.
// Routing rules:
//   no user_profile row        → create one → /onboarding
//   onboarding_completed=false → /onboarding
//   is_continuous challenge    → /journey
//   current_level = 1          → /challenge  (legacy)
//   current_level = 2          → /jamming    (legacy)
//   current_level = 3          → /grooving   (legacy)
//   otherwise                  → /dashboard  (fallback)

export default async function Home() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const profile = await getUserProfile()

  // Profile creation failed (DB error) — fall back to dashboard rather than loop
  if (!profile) redirect('/dashboard')

  if (!profile.onboarding_completed) redirect('/onboarding')

  // Continuous journey users always go to /journey
  const challenge = await getActiveChallenge()
  if (challenge?.is_continuous) redirect('/journey')

  // Legacy level routing
  if (profile.current_level === 1) redirect('/challenge')
  if (profile.current_level === 2) redirect('/jamming')
  if (profile.current_level === 3) redirect('/grooving/onboarding')

  redirect('/dashboard')
}
