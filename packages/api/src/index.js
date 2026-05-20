import express from 'express'
import helmet from 'helmet'
import cors from 'cors'

import { pool } from './config/db.js'
import { logger } from './utils/logger.js'
import { notFound, errorHandler } from './utils/errors.js'

const app = express()
const port = Number(process.env.API_PORT) || 3000

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(helmet())
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/v1/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1')
    res.json({ success: true, data: { status: 'ok', db: 'connected' } })
  } catch (err) {
    next(err)
  }
})

app.use(notFound)
app.use(errorHandler)

app.listen(port, () => {
  logger.info(`API listening on port ${port}`)
})
