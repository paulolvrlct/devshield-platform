import express from 'express'
import { createServer } from 'node:http'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { Server } from 'socket.io'

import { pool } from './config/db.js'
import { logger } from './utils/logger.js'
import { notFound, errorHandler } from './utils/errors.js'
import { generalLimiter } from './middleware/rateLimit.js'
import authRouter from './routes/auth.js'
import onboardingRouter from './routes/onboarding.js'
import clientsRouter from './routes/clients.js'
import invoicesRouter from './routes/invoices.js'
import dashboardRouter from './routes/dashboard.js'
import auditsRouter from './routes/audits.js'
import honeypotRouter from './routes/honeypot.js'
import { runAllChecks } from './services/monitor.js'
import { setSocketIo, watchLogFile } from './services/cowrie.js'

const app = express()
const port = Number(process.env.API_PORT) || 3000

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.set('trust proxy', 1)
app.use(helmet())
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use('/api', generalLimiter)

app.get('/api/v1/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1')
    res.json({ success: true, data: { status: 'ok', db: 'connected' } })
  } catch (err) {
    next(err)
  }
})

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/onboarding', onboardingRouter)
app.use('/api/v1/clients', clientsRouter)
app.use('/api/v1/invoices', invoicesRouter)
app.use('/api/v1/dashboard', dashboardRouter)
app.use('/api/v1/audits', auditsRouter)
app.use('/api/v1/honeypot', honeypotRouter)

app.use(notFound)
app.use(errorHandler)

// HTTP server + Socket.io
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: corsOrigins.length ? corsOrigins : true, credentials: true }
})

io.on('connection', (socket) => {
  socket.on('join:honeypot', () => socket.join('honeypot'))
  socket.on('leave:honeypot', () => socket.leave('honeypot'))
})

setSocketIo(io)

httpServer.listen(port, () => {
  logger.info(`API listening on port ${port}`)

  // Uptime monitoring: check every 5 minutes
  const FIVE_MINUTES = 5 * 60 * 1000
  runAllChecks()
  setInterval(runAllChecks, FIVE_MINUTES)

  // Cowrie log watcher (production only)
  const cowrieLog = process.env.COWRIE_LOG_PATH || '/var/log/cowrie/cowrie.json'
  watchLogFile(cowrieLog)
})
