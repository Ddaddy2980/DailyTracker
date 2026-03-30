'use client'

// Rendered by the /join/[inviteCode] server page once the user is authenticated.
// Auto-opens JoinGroupModal with the invite code pre-filled, then navigates home on close.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import JoinGroupModal from '@/components/groups/JoinGroupModal'
import type { ConsistencyGroup } from '@/lib/types'

interface Props {
  code: string
}

export default function JoinByCodeClient({ code }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(true)

  function handleJoined(_group: ConsistencyGroup) {
    // Modal shows its own success screen; once the user taps "Let's go" it calls onClose
    setOpen(false)
    router.push('/')
  }

  function handleClose() {
    setOpen(false)
    router.push('/')
  }

  if (!open) {
    // Brief blank state while the router transition completes
    return (
      <div className="min-h-screen bg-slate-950" />
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <JoinGroupModal
        initialCode={code}
        onJoined={handleJoined}
        onClose={handleClose}
      />
    </div>
  )
}
