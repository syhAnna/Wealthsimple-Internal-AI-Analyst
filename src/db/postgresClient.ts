// src/db/postgresClient.ts

import { Pool } from "pg"

export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end()
})

process.on("SIGINT", async () => {
  await pool.end()
})

// Made with Bob
