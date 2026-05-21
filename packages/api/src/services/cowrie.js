import fs from 'node:fs'
import readline from 'node:readline'

import { pool } from '../config/db.js'
import { logger } from '../utils/logger.js'
import { geolocateIp } from './geoip.js'

let ioInstance = null

export const setSocketIo = (io) => { ioInstance = io }

const RELEVANT_EVENTS = [
  'cowrie.login.success',
  'cowrie.login.failed',
  'cowrie.command.input',
  'cowrie.command.failed',
  'cowrie.session.connect',
  'cowrie.session.closed',
  'cowrie.direct-tcpip.request',
  'cowrie.client.version'
]

export const parseAndStore = async (logEntry) => {
  try {
    const event = typeof logEntry === 'string' ? JSON.parse(logEntry) : logEntry

    const eventId = event.eventid || event.event_type
    if (!eventId || !RELEVANT_EVENTS.includes(eventId)) return null

    const srcIp = event.src_ip || event.srcIp || ''
    const geo = await geolocateIp(srcIp)

    const mapped = {
      event_type: eventId,
      src_ip: srcIp,
      src_port: event.src_port || event.srcPort || null,
      dst_port: event.dst_port || event.dstPort || 22,
      username: event.username || null,
      password: event.password || null,
      command: event.input || event.message || null,
      session_id: event.session || null,
      country: geo.country,
      city: geo.city,
      latitude: geo.latitude,
      longitude: geo.longitude,
      raw_log: JSON.stringify(event),
      event_at: event.timestamp || new Date().toISOString()
    }

    const { rows } = await pool.query(
      `INSERT INTO honeypot.events
       (event_type, src_ip, src_port, dst_port, username, password, command, session_id, country, city, latitude, longitude, raw_log, event_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        mapped.event_type, mapped.src_ip, mapped.src_port, mapped.dst_port,
        mapped.username, mapped.password, mapped.command, mapped.session_id,
        mapped.country, mapped.city, mapped.latitude, mapped.longitude,
        mapped.raw_log, mapped.event_at
      ]
    )

    if (ioInstance) {
      ioInstance.to('honeypot').emit('honeypot:event', rows[0])
    }

    return rows[0]
  } catch (err) {
    logger.error(`Cowrie parse error: ${err.message}`)
    return null
  }
}

export const watchLogFile = (logPath) => {
  if (!logPath || !fs.existsSync(logPath)) {
    logger.info(`Cowrie log file not found at ${logPath}, skipping watch`)
    return
  }

  logger.info(`Watching Cowrie log: ${logPath}`)

  let fileSize = fs.statSync(logPath).size

  fs.watchFile(logPath, { interval: 2000 }, async () => {
    const newSize = fs.statSync(logPath).size
    if (newSize <= fileSize) { fileSize = newSize; return }

    const stream = fs.createReadStream(logPath, { start: fileSize, encoding: 'utf8' })
    fileSize = newSize

    const rl = readline.createInterface({ input: stream })
    for await (const line of rl) {
      if (line.trim()) await parseAndStore(line)
    }
  })
}
