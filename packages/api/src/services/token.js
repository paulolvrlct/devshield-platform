import crypto from 'node:crypto'

import jwt from 'jsonwebtoken'

import { pool } from '../config/db.js'

const accessSecret = process.env.JWT_SECRET
const refreshSecret = process.env.JWT_REFRESH_SECRET
const accessExpiry = process.env.JWT_EXPIRES_IN || '15m'
const refreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

// Hash SHA-256 du refresh token : seul le hash est stocké en base, jamais le token brut.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

export const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, accessSecret, { expiresIn: accessExpiry })

// Émet un refresh token signé et enregistre son hash en base (révocable).
export const issueRefreshToken = async (user) => {
  const token = jwt.sign({ sub: user.id }, refreshSecret, { expiresIn: refreshExpiry })
  const { exp } = jwt.decode(token)
  await pool.query(
    `INSERT INTO auth.refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, to_timestamp($3))`,
    [user.id, hashToken(token), exp]
  )
  return token
}

export const verifyAccessToken = (token) => jwt.verify(token, accessSecret)

// Vérifie la signature ET la présence en base (non révoqué, non expiré).
export const verifyRefreshToken = async (token) => {
  const payload = jwt.verify(token, refreshSecret)
  const { rows } = await pool.query(
    'SELECT id FROM auth.refresh_tokens WHERE token_hash = $1 AND expires_at > now()',
    [hashToken(token)]
  )
  if (rows.length === 0) {
    throw new Error('Refresh token révoqué ou expiré')
  }
  return payload
}

export const revokeRefreshToken = async (token) => {
  await pool.query('DELETE FROM auth.refresh_tokens WHERE token_hash = $1', [hashToken(token)])
}
