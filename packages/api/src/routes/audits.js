import { Router } from 'express'
import { z } from 'zod'

import { pool } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'
import { AppError } from '../utils/errors.js'
import { scanUrl } from '../services/scanner.js'
import { scanLimiter } from '../middleware/rateLimit.js'

const router = Router()
router.use(requireAuth)

const scanSchema = z.object({
  url: z.string().url().max(500),
  clientId: z.string().uuid().optional()
})

// POST /api/v1/audits/scan — lancer un scan OWASP (rate limited: 10/min)
router.post('/scan', scanLimiter, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Admin only')

    const parsed = scanSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0].message)
    }

    const { url, clientId } = parsed.data
    const result = await scanUrl(url)

    // Store scan in database
    const { rows } = await pool.query(
      `INSERT INTO audits.scans (client_id, url, hostname, grade, score, duration_ms, technologies, checks, summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        clientId || null,
        result.url,
        result.hostname,
        result.grade,
        result.score,
        result.durationMs,
        JSON.stringify(result.technologies),
        JSON.stringify(result.checks),
        JSON.stringify(result.summary)
      ]
    )

    res.status(201).json({
      success: true,
      data: {
        scan: {
          ...rows[0],
          technologies: result.technologies,
          checks: result.checks,
          summary: result.summary
        }
      }
    })
  } catch (err) { next(err) }
})

// GET /api/v1/audits — liste des scans
router.get('/', async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin'
    let query = `SELECT id, client_id, url, hostname, grade, score, duration_ms, created_at
                 FROM audits.scans`
    const params = []

    if (!isAdmin) {
      const { rows: cu } = await pool.query(
        'SELECT client_id FROM clients.client_users WHERE user_id = $1',
        [req.user.id]
      )
      if (!cu.length) throw new AppError(403, 'NO_CLIENT', 'Aucun client associé')
      params.push(cu[0].client_id)
      query += ' WHERE client_id = $1'
    } else if (req.query.clientId) {
      params.push(req.query.clientId)
      query += ' WHERE client_id = $1'
    }

    query += ' ORDER BY created_at DESC LIMIT 50'

    const { rows } = await pool.query(query, params)
    res.json({ success: true, data: { scans: rows } })
  } catch (err) { next(err) }
})

// GET /api/v1/audits/:id — détail d'un scan
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM audits.scans WHERE id = $1',
      [req.params.id]
    )
    if (!rows.length) throw new AppError(404, 'NOT_FOUND', 'Scan introuvable')

    const scan = rows[0]
    scan.technologies = JSON.parse(scan.technologies || '[]')
    scan.checks = JSON.parse(scan.checks || '[]')
    scan.summary = JSON.parse(scan.summary || '{}')

    res.json({ success: true, data: { scan } })
  } catch (err) { next(err) }
})

export default router
