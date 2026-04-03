import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserProfile } from '@/app/actions'
import { ConsistencyProfileFlow } from '@/components/consistency-profile'

export default async function ConsistencyProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const profile = await getUserProfile()

  if (profile?.consistency_profile_completed) redirect('/onboarding')

  return <ConsistencyProfileFlow userId={userId} />
}
