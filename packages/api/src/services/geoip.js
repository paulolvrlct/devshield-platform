import { logger } from '../utils/logger.js'

const cache = new Map()
const CACHE_TTL = 24 * 60 * 60 * 1000

export const geolocateIp = async (ip) => {
  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'Local', city: 'Local', latitude: 0, longitude: 0 }
  }

  const cached = cache.get(ip)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,lat,lon,status`)
    const json = await res.json()

    if (json.status !== 'success') {
      return { country: 'Unknown', city: 'Unknown', latitude: 0, longitude: 0 }
    }

    const data = {
      country: json.country || 'Unknown',
      city: json.city || 'Unknown',
      latitude: json.lat || 0,
      longitude: json.lon || 0
    }

    cache.set(ip, { data, ts: Date.now() })
    return data
  } catch (err) {
    logger.error(`GeoIP lookup failed for ${ip}: ${err.message}`)
    return { country: 'Unknown', city: 'Unknown', latitude: 0, longitude: 0 }
  }
}
