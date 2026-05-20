import bcrypt from 'bcryptjs'

import { pool } from '../config/db.js'

// Crée (ou met à jour) le compte administrateur initial.
// Usage : docker compose exec api npm run seed
// Les identifiants proviennent de ADMIN_EMAIL / ADMIN_PASSWORD (.env).

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD

const run = async () => {
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans .env')
  }
  const passwordHash = await bcrypt.hash(password, 12)
  await pool.query(
    `INSERT INTO auth.users (email, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (email)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
    [email, passwordHash]
  )
  process.stdout.write(`Compte admin prêt : ${email}\n`)
  await pool.end()
}

run().catch((err) => {
  process.stderr.write(`Échec du seed : ${err.message}\n`)
  process.exit(1)
})
