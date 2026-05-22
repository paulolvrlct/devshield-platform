import { Router } from 'express'
import { z } from 'zod'

import { pool } from '../config/db.js'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import { onboardingLimiter } from '../middleware/rateLimit.js'

const router = Router()

// --- Validation schemas ---

const submissionSchema = z.object({
  companyName: z.string().min(1).max(255),
  contactName: z.string().min(1).max(255),
  email: z.string().email().max(255),
  phone: z.string().max(30).optional().default(''),
  websiteUrl: z.string().max(500).optional().default(''),
  activity: z.string().max(2000).optional().default(''),
  pack: z.enum(['essentiel', 'optimal']).default('essentiel'),
  pages: z.string().max(2000).optional().default(''),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#00D4FF'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#0A1628'),
  content: z.string().max(5000).optional().default(''),
  notes: z.string().max(2000).optional().default('')
})

const statusSchema = z.object({
  status: z.enum(['new', 'in_progress', 'done', 'cancelled'])
})

// --- Routes ---

// POST /api/v1/onboarding — route publique, crée une soumission
// curl -X POST http://localhost:3000/api/v1/onboarding \
//   -H "Content-Type: application/json" \
//   -d '{"companyName":"Boulangerie Martin","contactName":"Jean Martin","email":"jean@martin.fr","pack":"essentiel"}'
router.post('/', onboardingLimiter, validate(submissionSchema), async (req, res, next) => {
  try {
    const {
      companyName, contactName, email, phone, websiteUrl,
      activity, pack, pages, primaryColor, secondaryColor,
      content, notes
    } = req.body

    const { rows } = await pool.query(
      `INSERT INTO onboarding.submissions
        (company_name, contact_name, email, phone, website_url,
         activity, pack, pages, primary_color, secondary_color,
         content, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, created_at`,
      [companyName, contactName, email, phone, websiteUrl,
       activity, pack, pages, primaryColor, secondaryColor,
       content, notes]
    )

    logger.info(`New onboarding submission: ${rows[0].id}`)
    res.status(201).json({
      success: true,
      data: { id: rows[0].id, createdAt: rows[0].created_at },
      message: 'Votre demande a bien été envoyée'
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/onboarding — admin uniquement, liste les soumissions
// curl http://localhost:3000/api/v1/onboarding -b "accessToken=..."
router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs')
    }

    const status = req.query.status || null
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const offset = Number(req.query.offset) || 0

    let query = 'SELECT * FROM onboarding.submissions'
    const params = []

    if (status) {
      params.push(status)
      query += ` WHERE status = $${params.length}`
    }

    query += ' ORDER BY created_at DESC'
    params.push(limit)
    query += ` LIMIT $${params.length}`
    params.push(offset)
    query += ` OFFSET $${params.length}`

    const { rows } = await pool.query(query, params)

    // Count total
    let countQuery = 'SELECT COUNT(*) FROM onboarding.submissions'
    const countParams = []
    if (status) {
      countParams.push(status)
      countQuery += ` WHERE status = $1`
    }
    const { rows: countRows } = await pool.query(countQuery, countParams)

    res.json({
      success: true,
      data: {
        submissions: rows,
        total: Number(countRows[0].count),
        limit,
        offset
      }
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/onboarding/:id — admin uniquement, détail d'une soumission
// curl http://localhost:3000/api/v1/onboarding/UUID -b "accessToken=..."
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs')
    }

    const { rows } = await pool.query(
      'SELECT * FROM onboarding.submissions WHERE id = $1',
      [req.params.id]
    )

    if (!rows.length) {
      throw new AppError(404, 'NOT_FOUND', 'Soumission introuvable')
    }

    res.json({ success: true, data: { submission: rows[0] } })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/v1/onboarding/:id/status — admin uniquement, change le statut
// curl -X PATCH http://localhost:3000/api/v1/onboarding/UUID/status \
//   -H "Content-Type: application/json" \
//   -b "accessToken=..." \
//   -d '{"status":"in_progress"}'
router.patch('/:id/status', requireAuth, validate(statusSchema), async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs')
    }

    const { rows } = await pool.query(
      `UPDATE onboarding.submissions SET status = $1 WHERE id = $2
       RETURNING id, status`,
      [req.body.status, req.params.id]
    )

    if (!rows.length) {
      throw new AppError(404, 'NOT_FOUND', 'Soumission introuvable')
    }

    res.json({ success: true, data: { submission: rows[0] } })
  } catch (err) {
    next(err)
  }
})

export default router
