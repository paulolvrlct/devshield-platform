import { Router } from 'express'
import { z } from 'zod'

import { pool } from '../config/db.js'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { AppError } from '../utils/errors.js'
import { generateInvoicePdf } from '../services/pdf.js'

const router = Router()

router.use(requireAuth, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs'))
  }
  next()
})

const invoiceSchema = z.object({
  clientId: z.string().uuid(),
  type: z.enum(['devis', 'facture']),
  pack: z.enum(['essentiel', 'optimal', 'custom']),
  description: z.string().max(2000).optional().default(''),
  amountHt: z.number().int().positive(),
  taxRate: z.number().int().min(0).max(100).default(0),
  issuedAt: z.string().optional(),
  dueAt: z.string().optional(),
  notes: z.string().max(2000).optional().default('')
})

const statusSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'cancelled'])
})

// Génère le numéro YYYY-NNN
const generateNumber = async (type) => {
  const year = new Date().getFullYear()
  const prefix = type === 'devis' ? 'D' : 'F'
  const { rows } = await pool.query("SELECT nextval('invoices.invoice_seq') AS seq")
  const seq = String(rows[0].seq).padStart(3, '0')
  return `${prefix}${year}-${seq}`
}

// GET /api/v1/invoices — liste des factures/devis
// curl http://localhost:3000/api/v1/invoices -b "accessToken=..."
router.get('/', async (req, res, next) => {
  try {
    const { type, status, clientId } = req.query
    let query = `
      SELECT i.*, c.company_name AS client_name, c.email AS client_email
      FROM invoices.invoices i
      JOIN clients.clients c ON c.id = i.client_id
    `
    const params = []
    const conditions = []

    if (type) {
      params.push(type)
      conditions.push(`i.type = $${params.length}`)
    }
    if (status) {
      params.push(status)
      conditions.push(`i.status = $${params.length}`)
    }
    if (clientId) {
      params.push(clientId)
      conditions.push(`i.client_id = $${params.length}`)
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ')
    query += ' ORDER BY i.created_at DESC'

    const { rows } = await pool.query(query, params)
    res.json({ success: true, data: { invoices: rows } })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/invoices/:id — détail
// curl http://localhost:3000/api/v1/invoices/UUID -b "accessToken=..."
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.*, c.company_name AS client_name, c.contact_name AS client_contact,
              c.email AS client_email, c.phone AS client_phone, c.address AS client_address,
              c.siret AS client_siret
       FROM invoices.invoices i
       JOIN clients.clients c ON c.id = i.client_id
       WHERE i.id = $1`,
      [req.params.id]
    )
    if (!rows.length) throw new AppError(404, 'NOT_FOUND', 'Document introuvable')
    res.json({ success: true, data: { invoice: rows[0] } })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/invoices — crée un devis ou une facture
// curl -X POST http://localhost:3000/api/v1/invoices \
//   -H "Content-Type: application/json" -b "accessToken=..." \
//   -d '{"clientId":"UUID","type":"devis","pack":"essentiel","amountHt":70000}'
router.post('/', validate(invoiceSchema), async (req, res, next) => {
  try {
    const { clientId, type, pack, description, amountHt, taxRate, issuedAt, dueAt, notes } = req.body

    // Vérifie que le client existe
    const { rows: clientRows } = await pool.query(
      'SELECT id FROM clients.clients WHERE id = $1', [clientId]
    )
    if (!clientRows.length) throw new AppError(404, 'NOT_FOUND', 'Client introuvable')

    const number = await generateNumber(type)
    const amountTtc = Math.round(amountHt * (1 + taxRate / 100))

    const { rows } = await pool.query(
      `INSERT INTO invoices.invoices
        (client_id, type, number, pack, description, amount_ht, tax_rate, amount_ttc,
         issued_at, due_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [clientId, type, number, pack, description, amountHt, taxRate, amountTtc,
       issuedAt || new Date().toISOString().split('T')[0],
       dueAt || null, notes]
    )

    res.status(201).json({ success: true, data: { invoice: rows[0] } })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/v1/invoices/:id/status — change le statut
// curl -X PATCH http://localhost:3000/api/v1/invoices/UUID/status \
//   -H "Content-Type: application/json" -b "accessToken=..." \
//   -d '{"status":"sent"}'
router.patch('/:id/status', validate(statusSchema), async (req, res, next) => {
  try {
    const paidAt = req.body.status === 'paid' ? new Date().toISOString().split('T')[0] : null

    const { rows } = await pool.query(
      `UPDATE invoices.invoices
       SET status = $1, paid_at = COALESCE($2, paid_at), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [req.body.status, paidAt, req.params.id]
    )

    if (!rows.length) throw new AppError(404, 'NOT_FOUND', 'Document introuvable')
    res.json({ success: true, data: { invoice: rows[0] } })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/invoices/:id/pdf — génère et télécharge le PDF
// curl http://localhost:3000/api/v1/invoices/UUID/pdf -b "accessToken=..." -o facture.pdf
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.*, c.company_name AS client_name, c.contact_name AS client_contact,
              c.email AS client_email, c.phone AS client_phone, c.address AS client_address,
              c.siret AS client_siret
       FROM invoices.invoices i
       JOIN clients.clients c ON c.id = i.client_id
       WHERE i.id = $1`,
      [req.params.id]
    )

    if (!rows.length) throw new AppError(404, 'NOT_FOUND', 'Document introuvable')

    const invoice = rows[0]
    const pdfBuffer = await generateInvoicePdf(invoice)
    const filename = `${invoice.number}.pdf`

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length
    })
    res.send(pdfBuffer)
  } catch (err) {
    next(err)
  }
})

export default router
