import https from 'node:https'
import http from 'node:http'
import tls from 'node:tls'

import { pool } from '../config/db.js'
import { logger } from '../utils/logger.js'

// Ping a single URL, return { statusCode, responseTimeMs, isUp, error }
export const checkUrl = (url) => {
  return new Promise((resolve) => {
    const start = Date.now()
    const proto = url.startsWith('https') ? https : http
    const timeout = 15000

    const req = proto.get(url, { timeout }, (res) => {
      const responseTimeMs = Date.now() - start
      res.resume()
      resolve({
        statusCode: res.statusCode,
        responseTimeMs,
        isUp: res.statusCode >= 200 && res.statusCode < 400,
        error: null
      })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({ statusCode: null, responseTimeMs: timeout, isUp: false, error: 'Timeout' })
    })

    req.on('error', (err) => {
      resolve({
        statusCode: null,
        responseTimeMs: Date.now() - start,
        isUp: false,
        error: err.message
      })
    })
  })
}

// Get SSL certificate info for a hostname
export const getSslInfo = (hostname) => {
  return new Promise((resolve) => {
    const socket = tls.connect(443, hostname, { servername: hostname }, () => {
      const cert = socket.getPeerCertificate()
      socket.end()

      if (!cert || !cert.valid_to) {
        return resolve(null)
      }

      resolve({
        issuer: cert.issuer?.O || cert.issuer?.CN || 'Unknown',
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        daysRemaining: Math.floor((new Date(cert.valid_to) - Date.now()) / 86400000),
        subject: cert.subject?.CN || hostname
      })
    })

    socket.on('error', () => resolve(null))
    socket.setTimeout(10000, () => { socket.destroy(); resolve(null) })
  })
}

// Run uptime checks for all active sites
export const runAllChecks = async () => {
  try {
    const { rows: sites } = await pool.query(
      'SELECT id, url FROM clients.sites WHERE is_active = true'
    )

    if (!sites.length) return

    logger.info(`Running uptime checks for ${sites.length} site(s)`)

    for (const site of sites) {
      const result = await checkUrl(site.url)

      await pool.query(
        `INSERT INTO clients.uptime_checks (site_id, status_code, response_time_ms, is_up, error)
         VALUES ($1, $2, $3, $4, $5)`,
        [site.id, result.statusCode, result.responseTimeMs, result.isUp, result.error]
      )
    }

    // Cleanup: keep only last 30 days of checks
    await pool.query(
      "DELETE FROM clients.uptime_checks WHERE checked_at < NOW() - INTERVAL '30 days'"
    )
  } catch (err) {
    logger.error(`Uptime check failed: ${err.message}`)
  }
}
