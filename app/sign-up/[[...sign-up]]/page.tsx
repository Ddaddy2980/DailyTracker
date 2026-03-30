import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserProfile } from '@/app/actions'
import SignUpPage from '../SignUpPage'

export default async function SignUpRoute() {
  const { userId } = await auth()

  if (userId) {
    const profile = await getUserProfile()
    if (profile?.onboarding_completed) {
      redirect('/journey')
    } else {
      redirect('/onboarding')
    }
  }

  return <SignUpPage />
}
