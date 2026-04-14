import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/onboarding(.*)',
  '/goals(.*)',
  '/join(.*)',
])

// /dev/* routes are invisible outside development.
// Returns a bare 404 — not a redirect — so the route's existence is not revealed.
const isDevRoute = createRouteMatcher(['/dev/(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isDevRoute(req) && process.env.NODE_ENV !== 'development') {
    return new NextResponse(null, { status: 404 })
  }

  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
