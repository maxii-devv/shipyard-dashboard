import { Pool } from 'pg'

// SSL is on by default (Supabase/managed Postgres). Set DATABASE_SSL=disable
// for a local/self-hosted Postgres on the VPS that has no TLS.
const sslDisabled = process.env.DATABASE_SSL === 'disable'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslDisabled ? false : { rejectUnauthorized: false },
  max: 5,
})

export default pool
