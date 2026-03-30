// =============================================================================
// One-time migration: focus_top_5 string[] → FocusTop5Item[]
//
// Old format: ["Learn piano", "Start a business", ...]
// New format: [{ rank: 1, text: "Learn piano" }, { rank: 2, text: "Start a business" }, ...]
//
// Run:
//   node --env-file=.env.local scripts/migrate-focus-top5.mjs
//
// Safe to re-run — only touches rows still in the old string array format.
// =============================================================================

import { createClient } from '@supabase/supabase-js'

// ── Environment check ─────────────────────────────────────────────────────────

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

// ── Step 1: Fetch all rows with focus_top_5 set ───────────────────────────────

console.log('Fetching user_profile rows where focus_top_5 IS NOT NULL...')

const { data: rows, error: fetchErr } = await sb
  .from('user_profile')
  .select('id, user_id, focus_top_5')
  .not('focus_top_5', 'is', null)

if (fetchErr) {
  console.error('ERROR fetching rows:', fetchErr.message)
  process.exit(1)
}

console.log(`  Found ${rows.length} row(s) with focus_top_5 set.`)

// ── Step 2: Identify rows still in the old string[] format ───────────────────

function isOldFormat(value) {
  return Array.isArray(value) && value.length > 0 && typeof value[0] === 'string'
}

const toMigrate = rows.filter(row => isOldFormat(row.focus_top_5))

console.log(`  ${toMigrate.length} row(s) in old string[] format — need migration.`)
console.log(`  ${rows.length - toMigrate.length} row(s) already in new FocusTop5Item[] format — skipping.`)

if (toMigrate.length === 0) {
  console.log('\nNothing to migrate. All rows are already in the correct format.')
  process.exit(0)
}

// ── Step 3: Transform and update each row ────────────────────────────────────

console.log('\nMigrating...')

let successCount = 0
let errorCount   = 0

for (const row of toMigrate) {
  const oldValue = row.focus_top_5                             // string[]
  const newValue = oldValue.map((text, i) => ({               // FocusTop5Item[]
    rank: i + 1,
    text,
  }))

  console.log(`\n  user_id: ${row.user_id}`)
  console.log(`  Before: ${JSON.stringify(oldValue)}`)
  console.log(`  After:  ${JSON.stringify(newValue)}`)

  const { error: updateErr } = await sb
    .from('user_profile')
    .update({
      focus_top_5: newValue,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', row.id)

  if (updateErr) {
    console.error(`  ✗ ERROR updating id=${row.id}: ${updateErr.message}`)
    errorCount++
  } else {
    console.log(`  ✓ Updated.`)
    successCount++
  }
}

// ── Step 4: Verification pass ─────────────────────────────────────────────────

console.log(`\n──────────────────────────────────────────`)
console.log(`Migration complete: ${successCount} updated, ${errorCount} errors.`)
console.log(`\nVerifying — re-fetching all focus_top_5 rows...`)

const { data: afterRows, error: verifyErr } = await sb
  .from('user_profile')
  .select('id, user_id, focus_top_5')
  .not('focus_top_5', 'is', null)

if (verifyErr) {
  console.error('ERROR during verification fetch:', verifyErr.message)
  process.exit(1)
}

const stillOld = afterRows.filter(row => isOldFormat(row.focus_top_5))

if (stillOld.length === 0) {
  console.log(`✓ Confirmed: 0 rows remain in the old string[] format.`)
  console.log(`  All ${afterRows.length} focus_top_5 row(s) are in FocusTop5Item[] format.`)
} else {
  console.error(`\nWARNING: ${stillOld.length} row(s) still in old format after migration:`)
  for (const r of stillOld) {
    console.error(`  user_id=${r.user_id}  value=${JSON.stringify(r.focus_top_5)}`)
  }
  process.exit(1)
}
