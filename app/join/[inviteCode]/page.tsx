// Deep-link join route — /join/[inviteCode]
//
// Behaviour:
//   • Unauthenticated → redirect to sign-in with this URL as the post-sign-in target
//   • Authenticated   → render JoinByCodeClient, which auto-opens JoinGroupModal pre-filled
//
// The /join/* path is intentionally left out of the protected-route middleware matcher
// so unauthenticated users reach this page and get a clean redirect rather than a
// generic auth wall. The redirect preserves the invite code via `redirect_url`.

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import JoinByCodeClient from './JoinByCodeClient'

interface PageProps {
  params: { inviteCode: string }
}

export default async function JoinByCodePage({ params }: PageProps) {
  const { userId }  = await auth()
  const code        = params.inviteCode.toUpperCase()

  if (!userId) {
    const returnUrl = encodeURIComponent(`/join/${code}`)
    redirect(`/sign-in?redirect_url=${returnUrl}`)
  }

  return <JoinByCodeClient code={code} />
}
