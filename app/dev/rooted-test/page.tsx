import { notFound } from 'next/navigation'
import RootedTestHarness from './RootedTestHarness'

// This page is strictly development-only.
// notFound() renders a 404 in production — the route never responds with content.
export default function RootedTestPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return <RootedTestHarness />
}
