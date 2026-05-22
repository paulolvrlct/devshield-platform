import { Router } from 'express'
import { z } from 'zod'

import { pool } from '../config/db.js'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { AppError } from '../utils/errors.js'

const router = Router()

// Toutes les routes clients sont admin-only
router.use(requireAuth, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError(403, 'FORBIDDEN', 'Accès réservé aux administrateurs'))
  }
  next()
})

const clientSchema = z.object({
  companyName: z.string().min(1).max(255),
  contactName: z.string().min(1).max(255),
  email: z.string().email().max(255),
  phone: z.string().max(30).optional().default(''),
  address: z.string().max(500).optional().default(''),
  siret: z.string().max(20).optional().default(''),
  websiteUrl: z.string().max(500).optional().default(''),
  notes: z.string().max(2000).optional().default('')
})

// GET /api/v1/clients — liste tous les clients
// curl http://localhost:3000/api/v1/clients -b "accessToken=..."
router.get('/', async (req, res, next) => {
  try {
    const search = req.query.search || ''
    let query = 'SELECT * FROM clients.clients'
    const params = []

    if (search) {
      params.push(`%${search}%`)
      query += ` WHERE company_name ILIKE $1 OR contact_name ILIKE $1 OR email ILIKE $1`
    }

    query += ' ORDER BY created_at DESC'

    const { rows } = await pool.query(query, params)
    res.json({ success: true, data: { clients: rows } })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/clients/:id — détail d'un client
// curl http://localhost:3000/api/v1/clients/UUID -b "accessToken=..."
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM clients.clients WHERE id = $1',
      [req.params.id]
    )
    if (!rows.length) throw new AppError(404, 'NOT_FOUND', 'Client introuvable')
    res.json({ success: true, data: { client: rows[0] } })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/clients — crée un client
// curl -X POST http://localhost:3000/api/v1/clients \
//   -H "Content-Type: application/json" -b "accessToken=..." \
//   -d '{"companyName":"Boulangerie Martin","contactName":"Jean Martin","email":"jean@martin.fr"}'
router.post('/', validate(clientSchema), async (req, res, next) => {
  try {
    const { companyName, contactName, email, phone, address, siret, websiteUrl, notes } = req.body

    const { rows } = await pool.query(
      `INSERT INTO clients.clients
        (company_name, contact_name, email, phone, address, siret, website_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [companyName, contactName, email, phone, address, siret, websiteUrl, notes]
    )

    res.status(201).json({ success: true, data: { client: rows[0] } })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/clients/:id — met à jour un client
// curl -X PUT http://localhost:3000/api/v1/clients/UUID \
//   -H "Content-Type: application/json" -b "accessToken=..." \
//   -d '{"companyName":"Boulangerie Martin","contactName":"Jean","email":"jean@martin.fr"}'
router.put('/:id', validate(clientSchema), async (req, res, next) => {
  try {
    const { companyName, contactName, email, phone, address, siret, websiteUrl, notes } = req.body

    const { rows } = await pool.query(
      `UPDATE clients.clients
       SET company_name=$1, contact_name=$2, email=$3, phone=$4,
           address=$5, siret=$6, website_url=$7, notes=$8, updated_at=CURRENT_TIMESTAMP
       WHERE id=$9
       RETURNING *`,
      [companyName, contactName, email, phone, address, siret, websiteUrl, notes, req.params.id]
    )

    if (!rows.length) throw new AppError(404, 'NOT_FOUND', 'Client introuvable')
    res.json({ success: true, data: { client: rows[0] } })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/clients/:id — supprime un client (si aucune facture liée)
// curl -X DELETE http://localhost:3000/api/v1/clients/UUID -b "accessToken=..."
router.delete('/:id', async (req, res, next) => {
  try {
    // Check for linked invoices (FK RESTRICT)
    const { rows: invoiceRows } = await pool.query(
      'SELECT COUNT(*) FROM invoices.invoices WHERE client_id = $1',
      [req.params.id]
    )
    if (Number(invoiceRows[0].count) > 0) {
      throw new AppError(409, 'CONFLICT', 'Impossible de supprimer ce client : des factures y sont liées. Supprimez-les d\'abord.')
    }

    const { rows } = await pool.query(
      'DELETE FROM clients.clients WHERE id = $1 RETURNING id',
      [req.params.id]
    )
    if (!rows.length) throw new AppError(404, 'NOT_FOUND', 'Client introuvable')

    res.json({ success: true, message: 'Client supprimé' })
  } catch (err) {
    next(err)
  }
})

export default router
