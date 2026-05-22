import { Router } from 'express'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'

import { pool } from '../config/db.js'
import { AppError } from '../utils/errors.js'
import { scanUrl } from '../services/scanner.js'

const router = Router()

// Rate limit strict pour les scans publics : 3 / minute / IP
const publicScanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Limite atteinte (3 scans/min). Réessayez dans une minute.' }
  }
})

const scanSchema = z.object({
  url: z.string().url().max(500)
})

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// POST /api/v1/public/scan — scan OWASP public (sans auth)
router.post('/scan', publicScanLimiter, async (req, res, next) => {
  try {
    const parsed = scanSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0].message)
    }

    const { url } = parsed.data
    const result = await scanUrl(url)

    // Store scan without client association
    const { rows } = await pool.query(
      `INSERT INTO audits.scans (client_id, url, hostname, grade, score, duration_ms, technologies, checks, summary)
       VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, url, hostname, grade, score, duration_ms, created_at`,
      [
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

// GET /api/v1/public/scan/:id — consulter un rapport public
router.get('/scan/:id', publicScanLimiter, async (req, res, next) => {
  try {
    if (!uuidRegex.test(req.params.id)) {
      throw new AppError(400, 'INVALID_ID', 'Identifiant invalide')
    }
    const { rows } = await pool.query(
      'SELECT * FROM audits.scans WHERE id = $1 AND client_id IS NULL',
      [req.params.id]
    )
    if (!rows.length) throw new AppError(404, 'NOT_FOUND', 'Rapport introuvable')

    const scan = rows[0]
    scan.technologies = JSON.parse(scan.technologies || '[]')
    scan.checks = JSON.parse(scan.checks || '[]')
    scan.summary = JSON.parse(scan.summary || '{}')

    res.json({ success: true, data: { scan } })
  } catch (err) { next(err) }
})

export default router
