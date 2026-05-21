import { Router } from 'express'
import { z } from 'zod'

import { pool } from '../config/db.js'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { AppError } from '../utils/errors.js'
import { getSslInfo } from '../services/monitor.js'

const router = Router()
router.use(requireAuth)

// Helper: get client_id for current user (admin sees all, client sees own)
const getClientId = async (user, paramClientId) => {
  if (user.role === 'admin' && paramClientId) return paramClientId
  if (user.role === 'admin') return null
  const { rows } = await pool.query(
    'SELECT client_id FROM clients.client_users WHERE user_id = $1',
    [user.id]
  )
  if (!rows.length) throw new AppError(403, 'NO_CLIENT', 'Aucun client associé à ce compte')
  return rows[0].client_id
}

// --- Admin: manage sites ---

const siteSchema = z.object({
  clientId: z.string().uuid(),
  url: z.string().url().max(500),
  label: z.string().max(255).optional().default('')
})

// POST /api/v1/dashboard/sites — admin crée un site à monitorer
router.post('/sites', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Admin only')
    const parsed = siteSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    const { clientId, url, label } = parsed.data
    const { rows } = await pool.query(
      `INSERT INTO clients.sites (client_id, url, label)
       VALUES ($1, $2, $3) RETURNING *`,
      [clientId, url, label]
    )
    res.status(201).json({ success: true, data: { site: rows[0] } })
  } catch (err) { next(err) }
})

// GET /api/v1/dashboard/sites — liste des sites
router.get('/sites', async (req, res, next) => {
  try {
    const clientId = await getClientId(req.user, req.query.clientId)
    let query = `SELECT s.*, c.company_name AS client_name FROM clients.sites s
                 JOIN clients.clients c ON c.id = s.client_id`
    const params = []
    if (clientId) {
      params.push(clientId)
      query += ` WHERE s.client_id = $1`
    }
    query += ' ORDER BY s.created_at DESC'
    const { rows } = await pool.query(query, params)
    res.json({ success: true, data: { sites: rows } })
  } catch (err) { next(err) }
})

// GET /api/v1/dashboard/sites/:id/uptime — historique uptime
router.get('/sites/:id/uptime', async (req, res, next) => {
  try {
    const hours = Math.min(Number(req.query.hours) || 24, 720)
    const { rows } = await pool.query(
      `SELECT status_code, response_time_ms, is_up, error, checked_at
       FROM clients.uptime_checks
       WHERE site_id = $1 AND checked_at > NOW() - INTERVAL '1 hour' * $2
       ORDER BY checked_at ASC`,
      [req.params.id, hours]
    )
    const total = rows.length
    const up = rows.filter((r) => r.is_up).length
    const uptimePercent = total > 0 ? ((up / total) * 100).toFixed(2) : null
    const avgResponseMs = total > 0
      ? Math.round(rows.reduce((s, r) => s + (r.response_time_ms || 0), 0) / total)
      : null
    res.json({ success: true, data: { checks: rows, uptimePercent, avgResponseMs, total } })
  } catch (err) { next(err) }
})

// GET /api/v1/dashboard/sites/:id/ssl — info SSL
router.get('/sites/:id/ssl', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT url FROM clients.sites WHERE id = $1', [req.params.id]
    )
    if (!rows.length) throw new AppError(404, 'NOT_FOUND', 'Site introuvable')
    const hostname = new URL(rows[0].url).hostname
    const ssl = await getSslInfo(hostname)
    res.json({ success: true, data: { ssl } })
  } catch (err) { next(err) }
})

// --- Interventions ---

const interventionSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional().default(''),
  type: z.enum(['maintenance', 'update', 'fix', 'security', 'other']).default('maintenance'),
  performedAt: z.string().optional()
})

// POST /api/v1/dashboard/interventions — admin ajoute
router.post('/interventions', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Admin only')
    const parsed = interventionSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0].message)
    }
    const { clientId, title, description, type, performedAt } = parsed.data
    const { rows } = await pool.query(
      `INSERT INTO clients.interventions (client_id, title, description, type, performed_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [clientId, title, description, type, performedAt || new Date().toISOString().split('T')[0]]
    )
    res.status(201).json({ success: true, data: { intervention: rows[0] } })
  } catch (err) { next(err) }
})

// GET /api/v1/dashboard/interventions
router.get('/interventions', async (req, res, next) => {
  try {
    const clientId = await getClientId(req.user, req.query.clientId)
    if (!clientId) throw new AppError(400, 'BAD_REQUEST', 'clientId requis')
    const { rows } = await pool.query(
      `SELECT * FROM clients.interventions WHERE client_id = $1 ORDER BY performed_at DESC`,
      [clientId]
    )
    res.json({ success: true, data: { interventions: rows } })
  } catch (err) { next(err) }
})

// GET /api/v1/dashboard/invoices — factures visibles par le client
router.get('/invoices', async (req, res, next) => {
  try {
    const clientId = await getClientId(req.user, req.query.clientId)
    if (!clientId) throw new AppError(400, 'BAD_REQUEST', 'clientId requis')
    const { rows } = await pool.query(
      `SELECT id, type, number, status, pack, amount_ht, amount_ttc, issued_at, paid_at
       FROM invoices.invoices
       WHERE client_id = $1 AND status != 'draft'
       ORDER BY issued_at DESC`,
      [clientId]
    )
    res.json({ success: true, data: { invoices: rows } })
  } catch (err) { next(err) }
})

// GET /api/v1/dashboard/overview — résumé pour un client
router.get('/overview', async (req, res, next) => {
  try {
    const clientId = await getClientId(req.user, req.query.clientId)
    if (!clientId) throw new AppError(400, 'BAD_REQUEST', 'clientId requis')

    const { rows: clientRows } = await pool.query(
      'SELECT * FROM clients.clients WHERE id = $1', [clientId]
    )
    if (!clientRows.length) throw new AppError(404, 'NOT_FOUND', 'Client introuvable')

    const { rows: sites } = await pool.query(
      `SELECT s.id, s.url, s.label,
              (SELECT is_up FROM clients.uptime_checks WHERE site_id = s.id ORDER BY checked_at DESC LIMIT 1) AS last_up,
              (SELECT response_time_ms FROM clients.uptime_checks WHERE site_id = s.id ORDER BY checked_at DESC LIMIT 1) AS last_response_ms
       FROM clients.sites s WHERE s.client_id = $1 AND s.is_active = true`,
      [clientId]
    )

    const { rows: invoiceStats } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'sent') AS pending,
         COUNT(*) FILTER (WHERE status = 'paid') AS paid,
         COALESCE(SUM(amount_ttc) FILTER (WHERE status = 'sent'), 0) AS pending_amount
       FROM invoices.invoices WHERE client_id = $1`,
      [clientId]
    )

    const { rows: recentInterventions } = await pool.query(
      `SELECT title, type, performed_at FROM clients.interventions
       WHERE client_id = $1 ORDER BY performed_at DESC LIMIT 5`,
      [clientId]
    )

    res.json({
      success: true,
      data: {
        client: clientRows[0],
        sites,
        invoiceStats: invoiceStats[0],
        recentInterventions
      }
    })
  } catch (err) { next(err) }
})

export default router
