'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UserAvatarMenu() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Build initials from firstName + lastName (or email fallback)
  const firstName = user?.firstName ?? ''
  const lastName = user?.lastName ?? ''
  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : firstName
    ? firstName[0].toUpperCase()
    : (user?.emailAddresses?.[0]?.emailAddress?.[0] ?? '?').toUpperCase()

  const displayName = [firstName, lastName].filter(Boolean).join(' ') ||
    (user?.emailAddresses?.[0]?.emailAddress ?? '')

  async function handleSignOut() {
    await signOut()
    router.push('/sign-in')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-bold leading-none focus:outline-none"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-48 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
          {displayName && (
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-800 truncate">{displayName}</p>
            </div>
          )}
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 font-medium"
          >
            Settings
          </Link>
          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-slate-50 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
