import { Pool } from 'pg'

// `DATABASE_SSL=disable` matches the in-stack `izan-db` container which speaks
// plain TCP. Anything else (managed Postgres, Supabase, RDS) keeps SSL on with
// `rejectUnauthorized: false` since cert chains aren't validated app-side.
const sslDisabled = process.env.DATABASE_SSL === 'disable'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslDisabled ? false : { rejectUnauthorized: false },
  max: 5,
})

export default pool
