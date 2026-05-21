import { Router } from 'express'
import { z } from 'zod'

import { pool } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'
import { AppError } from '../utils/errors.js'
import { parseAndStore } from '../services/cowrie.js'

const router = Router()
router.use(requireAuth)

// GET /api/v1/honeypot/events — derniers événements (timeline)
router.get('/events', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Admin only')
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const offset = Number(req.query.offset) || 0
    const type = req.query.type || null

    let query = 'SELECT * FROM honeypot.events'
    const params = []

    if (type) {
      params.push(type)
      query += ' WHERE event_type = $1'
    }

    query += ' ORDER BY event_at DESC'
    params.push(limit)
    query += ` LIMIT $${params.length}`
    params.push(offset)
    query += ` OFFSET $${params.length}`

    const { rows } = await pool.query(query, params)
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) AS total FROM honeypot.events'
    )

    res.json({
      success: true,
      data: { events: rows, total: Number(countRows[0].total) }
    })
  } catch (err) { next(err) }
})

// GET /api/v1/honeypot/stats — statistiques globales
router.get('/stats', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Admin only')
    const hours = Math.min(Number(req.query.hours) || 24, 720)

    const timeFilter = `event_at > NOW() - INTERVAL '1 hour' * $1`

    const [
      { rows: totalRows },
      { rows: topPasswords },
      { rows: topUsernames },
      { rows: topCommands },
      { rows: topCountries },
      { rows: topIps },
      { rows: perDay },
      { rows: perType }
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE event_type = 'cowrie.login.failed') AS login_failed,
                COUNT(*) FILTER (WHERE event_type = 'cowrie.login.success') AS login_success,
                COUNT(*) FILTER (WHERE event_type LIKE 'cowrie.command.%') AS commands,
                COUNT(DISTINCT src_ip) AS unique_ips
         FROM honeypot.events WHERE ${timeFilter}`,
        [hours]
      ),
      pool.query(
        `SELECT password, COUNT(*) AS count FROM honeypot.events
         WHERE ${timeFilter} AND password IS NOT NULL
         GROUP BY password ORDER BY count DESC LIMIT 10`,
        [hours]
      ),
      pool.query(
        `SELECT username, COUNT(*) AS count FROM honeypot.events
         WHERE ${timeFilter} AND username IS NOT NULL
         GROUP BY username ORDER BY count DESC LIMIT 10`,
        [hours]
      ),
      pool.query(
        `SELECT command, COUNT(*) AS count FROM honeypot.events
         WHERE ${timeFilter} AND command IS NOT NULL
         GROUP BY command ORDER BY count DESC LIMIT 10`,
        [hours]
      ),
      pool.query(
        `SELECT country, COUNT(*) AS count FROM honeypot.events
         WHERE ${timeFilter} AND country IS NOT NULL AND country != 'Unknown'
         GROUP BY country ORDER BY count DESC LIMIT 10`,
        [hours]
      ),
      pool.query(
        `SELECT src_ip, country, COUNT(*) AS count FROM honeypot.events
         WHERE ${timeFilter}
         GROUP BY src_ip, country ORDER BY count DESC LIMIT 10`,
        [hours]
      ),
      pool.query(
        `SELECT DATE(event_at) AS day, COUNT(*) AS count
         FROM honeypot.events
         WHERE event_at > NOW() - INTERVAL '30 days'
         GROUP BY day ORDER BY day ASC`,
        []
      ),
      pool.query(
        `SELECT event_type, COUNT(*) AS count FROM honeypot.events
         WHERE ${timeFilter}
         GROUP BY event_type ORDER BY count DESC`,
        [hours]
      )
    ])

    res.json({
      success: true,
      data: {
        summary: totalRows[0],
        topPasswords,
        topUsernames,
        topCommands,
        topCountries,
        topIps,
        perDay,
        perType
      }
    })
  } catch (err) { next(err) }
})

// GET /api/v1/honeypot/map — données pour la carte
router.get('/map', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Admin only')
    const hours = Math.min(Number(req.query.hours) || 24, 720)

    const { rows } = await pool.query(
      `SELECT src_ip, country, city, latitude, longitude, COUNT(*) AS count
       FROM honeypot.events
       WHERE event_at > NOW() - INTERVAL '1 hour' * $1
         AND latitude != 0 AND longitude != 0
       GROUP BY src_ip, country, city, latitude, longitude
       ORDER BY count DESC LIMIT 500`,
      [hours]
    )

    res.json({ success: true, data: { points: rows } })
  } catch (err) { next(err) }
})

// POST /api/v1/honeypot/ingest — injection manuelle d'événement (admin/test)
const ingestSchema = z.object({
  eventid: z.string().min(1),
  src_ip: z.string().min(1),
  src_port: z.number().optional(),
  dst_port: z.number().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  input: z.string().optional(),
  session: z.string().optional(),
  timestamp: z.string().optional()
})

router.post('/ingest', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Admin only')

    const parsed = ingestSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0].message)
    }

    const event = await parseAndStore(parsed.data)
    if (!event) throw new AppError(400, 'INVALID_EVENT', 'Événement non reconnu')

    res.status(201).json({ success: true, data: { event } })
  } catch (err) { next(err) }
})

export default router
