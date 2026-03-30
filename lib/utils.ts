// =============================================================================
// /lib/utils.ts — shared utility functions
//
// Server-safe: no browser APIs used here.
// generateInviteCode is async because it queries Supabase for collision checks.
// =============================================================================

import { createServerSupabaseClient } from '@/lib/supabase'

// ── Invite code generation ────────────────────────────────────────────────────

// Word list: short (5–7 letters), positive, encouraging — not random-feeling.
const INVITE_WORDS = [
  'GRACE', 'FAITH', 'PRESS', 'FOCUS', 'CLIMB',
  'REACH', 'BUILD', 'FORGE', 'LIGHT', 'STAND',
] as const

// Characters used for the 4-char suffix — uppercase alphanumeric, visually
// unambiguous (no 0/O, 1/I/L confusion).
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function pickWord(): string {
  return INVITE_WORDS[Math.floor(Math.random() * INVITE_WORDS.length)]
}

function pickSuffix(): string {
  return Array.from({ length: 4 }, () =>
    SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]
  ).join('')
}

/**
 * Generates a unique invite code in the format [WORD]-[4CHARS], e.g. 'RIVER-4K2M'.
 *
 * Queries the consistency_groups table to confirm the generated code is not
 * already in use. Retries up to maxAttempts times before throwing — in
 * practice a collision is astronomically unlikely (10 words × 31^4 = ~9.5M
 * combinations) but the guard is required by the spec.
 */
export async function generateInviteCode(maxAttempts = 10): Promise<string> {
  const sb = createServerSupabaseClient()

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = `${pickWord()}-${pickSuffix()}`

    const { data, error } = await sb
      .from('consistency_groups')
      .select('id')
      .eq('invite_code', candidate)
      .maybeSingle()

    if (error) {
      console.error('generateInviteCode: collision check failed', error)
      throw new Error(`generateInviteCode: ${error.message}`)
    }

    // No existing row → code is available
    if (!data) return candidate
  }

  throw new Error(`generateInviteCode: could not produce a unique code after ${maxAttempts} attempts`)
}
