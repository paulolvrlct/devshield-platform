import pg from 'pg'

import { logger } from '../utils/logger.js'

const { Pool } = pg

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000
})

pool.on('error', (err) => {
  logger.error(`Unexpected PostgreSQL pool error: ${err.message}`)
})
