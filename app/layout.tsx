import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'Daily Consistency Tracker',
  description: 'Track your daily goals and build streaks',
  icons: {
    icon:             '/Logo.png',
    shortcut:         '/Logo.png',
    apple:            '/Logo.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Daily Consistency Tracker',
  },
}

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit:  'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="text-dct-text antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
