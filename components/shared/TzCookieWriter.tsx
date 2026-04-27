'use client'

import { useEffect } from 'react'

// Writes the browser's IANA timezone to a cookie on every render so server
// components and API routes can compute the correct local calendar date.
export default function TzCookieWriter() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    document.cookie = `tz=${encodeURIComponent(tz)};path=/;max-age=31536000;SameSite=Lax`
  }, [])
  return null
}
