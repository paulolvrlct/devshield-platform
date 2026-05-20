import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

import { pool } from '../config/db.js'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimit.js'
import {
  signAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken
} from '../services/token.js'
import { AppError } from '../utils/errors.js'

const router = Router()

// Hash factice : égalise le temps de réponse quand l'email n'existe pas (anti-énumération).
const DUMMY_HASH = bcrypt.hashSync('devshield-timing-guard', 12)

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis')
})

// Cookies httpOnly : inaccessibles au JS client, donc protégés contre le vol par XSS.
const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/'
}
const accessCookie = { ...cookieBase, maxAge: 15 * 60 * 1000 }
const refreshCookie = { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 }

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, accessCookie)
  res.cookie('refreshToken', refreshToken, refreshCookie)
}

/*
 * POST /api/v1/auth/login
 * curl -i -X POST http://localhost/api/v1/auth/login \
 *   -H 'Content-Type: application/json' \
 *   -d '{"email":"admin@devshield.fr","password":"motdepasse"}'
 */
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, role FROM auth.users WHERE email = $1',
      [email]
    )
    const user = rows[0]
    const valid = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH)
    if (!user || !valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect')
    }
    const accessToken = signAccessToken(user)
    const refreshToken = await issueRefreshToken(user)
    setAuthCookies(res, accessToken, refreshToken)
    res.json({
      success: true,
      data: { user: { id: user.id, email: user.email, role: user.role } }
    })
  } catch (err) {
    next(err)
  }
})

/*
 * POST /api/v1/auth/refresh — renouvelle l'access token via le cookie refresh.
 * curl -i -X POST http://localhost/api/v1/auth/refresh --cookie 'refreshToken=...'
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) throw new AppError(401, 'NO_REFRESH_TOKEN', 'Session expirée')
    const payload = await verifyRefreshToken(token)
    const { rows } = await pool.query(
      'SELECT id, email, role FROM auth.users WHERE id = $1',
      [payload.sub]
    )
    const user = rows[0]
    if (!user) throw new AppError(401, 'INVALID_TOKEN', 'Session invalide')
    // Rotation : l'ancien refresh token est révoqué, un nouveau est émis.
    await revokeRefreshToken(token)
    const accessToken = signAccessToken(user)
    const refreshToken = await issueRefreshToken(user)
    setAuthCookies(res, accessToken, refreshToken)
    res.json({ success: true, data: { user } })
  } catch (err) {
    if (err instanceof AppError) return next(err)
    next(new AppError(401, 'INVALID_TOKEN', 'Session invalide ou expirée'))
  }
})

/*
 * POST /api/v1/auth/logout — révoque le refresh token et efface les cookies.
 * curl -i -X POST http://localhost/api/v1/auth/logout --cookie 'refreshToken=...'
 */
router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken
    if (token) await revokeRefreshToken(token)
    res.clearCookie('accessToken', cookieBase)
    res.clearCookie('refreshToken', cookieBase)
    res.json({ success: true, message: 'Déconnecté' })
  } catch (err) {
    next(err)
  }
})

/*
 * GET /api/v1/auth/me — renvoie l'utilisateur authentifié courant.
 * curl -i http://localhost/api/v1/auth/me --cookie 'accessToken=...'
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, role, created_at FROM auth.users WHERE id = $1',
      [req.user.id]
    )
    if (rows.length === 0) throw new AppError(401, 'INVALID_TOKEN', 'Session invalide')
    res.json({ success: true, data: { user: rows[0] } })
  } catch (err) {
    next(err)
  }
})

export default router
