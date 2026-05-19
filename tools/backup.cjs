#!/usr/bin/env node
/**
 * Exports the accumulated learning to a timestamped JSON file so it survives
 * a Supabase loss / accidental deletion. Run: `npm run backup` (from viral-coach/).
 *
 * Backs up only the data tables. system_config is intentionally skipped — it
 * holds the Instagram token and must never land in a plaintext backup file.
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const TABLES = [
  'content_performance',
  'content_performance_snapshots',
  'content_posts',
]

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const envPath = path.join(__dirname, '..', '.env.local')
  const line = fs
    .readFileSync(envPath, 'utf8')
    .split('\n')
    .find(l => l.startsWith('DATABASE_URL='))
  if (!line) throw new Error('DATABASE_URL not found in env or .env.local')
  return line.slice('DATABASE_URL='.length).trim()
}

async function main() {
  const client = new Client({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  const dump = { exported_at: new Date().toISOString(), tables: {} }
  try {
    for (const t of TABLES) {
      const res = await client.query(`SELECT * FROM ${t}`)
      dump.tables[t] = res.rows
      console.log(`  ${t}: ${res.rows.length} rows`)
    }
  } finally {
    await client.end()
  }

  const dir = path.join(__dirname, '..', 'backups')
  fs.mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const file = path.join(dir, `viral-coach-backup-${stamp}.json`)
  fs.writeFileSync(file, JSON.stringify(dump, null, 2))

  // Keep the 14 most recent backups; prune older ones.
  const old = fs
    .readdirSync(dir)
    .filter(f => f.startsWith('viral-coach-backup-') && f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(14)
  for (const f of old) fs.unlinkSync(path.join(dir, f))

  console.log(`\nBackup written: ${file}`)
}

main().catch(err => {
  console.error('Backup failed:', err.message)
  process.exit(1)
})
