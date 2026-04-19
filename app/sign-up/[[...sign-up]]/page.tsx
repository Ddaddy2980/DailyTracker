import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import SignUpPage from '../SignUpPage'

export default async function SignUpRoute() {
  const { userId } = await auth()

  if (userId) {
    redirect('/')
  }

  return <SignUpPage />
}
