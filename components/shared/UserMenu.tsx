'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser, SignOutButton } from '@clerk/nextjs'

export default function UserMenu() {
  const { user } = useUser()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const initials = user
    ? ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? user.firstName?.[1] ?? '')).toUpperCase()
    : '?'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 transition-colors"
        aria-label="Account menu"
      >
        {initials || '?'}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-36 bg-slate-800 border border-slate-700 rounded-xl shadow-lg overflow-hidden z-50">
          <SignOutButton redirectUrl="/">
            <button className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors">
              Sign out
            </button>
          </SignOutButton>
        </div>
      )}
    </div>
  )
}
