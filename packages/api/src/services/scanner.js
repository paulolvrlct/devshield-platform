import https from 'node:https'
import http from 'node:http'
import tls from 'node:tls'
import dns from 'node:dns/promises'
import { URL } from 'node:url'

import { logger } from '../utils/logger.js'

const TIMEOUT = Number(process.env.SCAN_TIMEOUT_MS) || 30000

// Anti-SSRF: block private/internal IPs to prevent scanning the internal network
const BLOCKED_RANGES = [
  /^127\./,                    // loopback
  /^10\./,                     // private class A
  /^172\.(1[6-9]|2\d|3[01])\./, // private class B
  /^192\.168\./,               // private class C
  /^169\.254\./,               // link-local
  /^0\./,                      // current network
  /^::1$/,                     // IPv6 loopback
  /^fd/i,                      // IPv6 unique local
  /^fe80/i                     // IPv6 link-local
]

const isPrivateIp = (ip) => BLOCKED_RANGES.some((r) => r.test(ip))

const validateHostname = async (hostname) => {
  // Block internal Docker hostnames
  const blocked = ['localhost', 'api', 'frontend', 'postgres', 'caddy', 'cowrie']
  if (blocked.includes(hostname.toLowerCase())) {
    throw new Error('Adresse interne non autorisée')
  }
  // Resolve DNS and check if IP is private
  try {
    const addresses = await dns.resolve4(hostname)
    for (const ip of addresses) {
      if (isPrivateIp(ip)) {
        throw new Error('Adresse interne non autorisée')
      }
    }
  } catch (err) {
    if (err.message === 'Adresse interne non autorisée') throw err
    // DNS resolution failed — let the scan proceed (it will timeout)
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

const fetchHeaders = (url) => {
  return new Promise((resolve) => {
    const proto = url.startsWith('https') ? https : http
    const req = proto.get(url, { timeout: TIMEOUT }, (res) => {
      res.resume()
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        redirectUrl: res.headers.location || null
      })
    })
    req.on('timeout', () => { req.destroy(); resolve(null) })
    req.on('error', () => resolve(null))
  })
}

const fetchSslCert = (hostname) => {
  return new Promise((resolve) => {
    const socket = tls.connect(443, hostname, { servername: hostname }, () => {
      const cert = socket.getPeerCertificate()
      socket.end()
      if (!cert || !cert.valid_to) return resolve(null)
      resolve({
        issuer: cert.issuer?.O || cert.issuer?.CN || 'Unknown',
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        daysRemaining: Math.floor((new Date(cert.valid_to) - Date.now()) / 86400000),
        subject: cert.subject?.CN || hostname,
        protocol: socket.getProtocol?.() || 'unknown'
      })
    })
    socket.on('error', () => resolve(null))
    socket.setTimeout(10000, () => { socket.destroy(); resolve(null) })
  })
}

// ─── Individual checks ───────────────────────────────────────────

const checkSecurityHeaders = (headers) => {
  const checks = []
  const h = headers || {}

  const hsts = h['strict-transport-security']
  checks.push({
    name: 'Strict-Transport-Security',
    category: 'headers',
    passed: !!hsts,
    value: hsts || 'Absent',
    severity: 'high',
    description: hsts
      ? 'HSTS activé, le navigateur force HTTPS.'
      : 'HSTS absent. Le site est vulnérable aux attaques de downgrade.'
  })

  const csp = h['content-security-policy']
  checks.push({
    name: 'Content-Security-Policy',
    category: 'headers',
    passed: !!csp,
    value: csp ? (csp.length > 100 ? csp.substring(0, 100) + '…' : csp) : 'Absent',
    severity: 'high',
    description: csp
      ? 'CSP configuré, protection contre les injections XSS.'
      : 'CSP absent. Le site est vulnérable aux attaques XSS.'
  })

  const xcto = h['x-content-type-options']
  checks.push({
    name: 'X-Content-Type-Options',
    category: 'headers',
    passed: xcto === 'nosniff',
    value: xcto || 'Absent',
    severity: 'medium',
    description: xcto === 'nosniff'
      ? 'Protection contre le MIME sniffing activée.'
      : 'X-Content-Type-Options absent. Risque de MIME sniffing.'
  })

  const xfo = h['x-frame-options']
  checks.push({
    name: 'X-Frame-Options',
    category: 'headers',
    passed: !!xfo,
    value: xfo || 'Absent',
    severity: 'medium',
    description: xfo
      ? 'Protection contre le clickjacking activée.'
      : 'X-Frame-Options absent. Le site peut être intégré dans une iframe (clickjacking).'
  })

  const xxss = h['x-xss-protection']
  checks.push({
    name: 'X-XSS-Protection',
    category: 'headers',
    passed: !!xxss && xxss !== '0',
    value: xxss || 'Absent',
    severity: 'low',
    description: xxss && xxss !== '0'
      ? 'Filtre XSS du navigateur activé (header legacy).'
      : 'X-XSS-Protection absent (header legacy, CSP est plus important).'
  })

  const rp = h['referrer-policy']
  checks.push({
    name: 'Referrer-Policy',
    category: 'headers',
    passed: !!rp,
    value: rp || 'Absent',
    severity: 'low',
    description: rp
      ? 'Politique de referrer configurée.'
      : 'Referrer-Policy absent. Les URLs complètes peuvent être exposées.'
  })

  const pp = h['permissions-policy']
  checks.push({
    name: 'Permissions-Policy',
    category: 'headers',
    passed: !!pp,
    value: pp ? (pp.length > 100 ? pp.substring(0, 100) + '…' : pp) : 'Absent',
    severity: 'low',
    description: pp
      ? 'Permissions-Policy configuré, contrôle des APIs navigateur.'
      : 'Permissions-Policy absent. Pas de restriction sur les APIs navigateur.'
  })

  const server = h['server']
  checks.push({
    name: 'Server Header',
    category: 'headers',
    passed: !server,
    value: server || 'Masqué',
    severity: 'low',
    description: server
      ? `Le serveur expose sa technologie : "${server}". Information utile aux attaquants.`
      : 'Header Server masqué, pas de fuite d\'information.'
  })

  const xpb = h['x-powered-by']
  checks.push({
    name: 'X-Powered-By',
    category: 'headers',
    passed: !xpb,
    value: xpb || 'Absent',
    severity: 'low',
    description: xpb
      ? `Technologie exposée : "${xpb}". Retirez ce header.`
      : 'X-Powered-By absent, pas de fuite technologique.'
  })

  return checks
}

const checkSsl = async (hostname) => {
  const cert = await fetchSslCert(hostname)

  if (!cert) {
    return [{
      name: 'Certificat SSL',
      category: 'ssl',
      passed: false,
      value: 'Impossible de se connecter en TLS',
      severity: 'critical',
      description: 'Aucun certificat SSL valide détecté. Le site n\'est pas sécurisé.'
    }]
  }

  const checks = []

  checks.push({
    name: 'Certificat SSL',
    category: 'ssl',
    passed: cert.daysRemaining > 0,
    value: `${cert.issuer} — expire le ${cert.validTo}`,
    severity: cert.daysRemaining <= 0 ? 'critical' : cert.daysRemaining < 30 ? 'high' : 'info',
    description: cert.daysRemaining <= 0
      ? 'Le certificat SSL est expiré !'
      : cert.daysRemaining < 30
        ? `Le certificat expire dans ${cert.daysRemaining} jours. Renouvelez-le rapidement.`
        : `Certificat valide, expire dans ${cert.daysRemaining} jours.`
  })

  checks.push({
    name: 'Protocole TLS',
    category: 'ssl',
    passed: cert.protocol !== 'TLSv1' && cert.protocol !== 'TLSv1.1',
    value: cert.protocol,
    severity: 'high',
    description: cert.protocol === 'TLSv1' || cert.protocol === 'TLSv1.1'
      ? `Protocole ${cert.protocol} obsolète et vulnérable. Utilisez TLS 1.2 ou 1.3.`
      : `Protocole ${cert.protocol} utilisé.`
  })

  return checks
}

const checkHttpsRedirect = async (hostname) => {
  const httpUrl = `http://${hostname}`
  const result = await fetchHeaders(httpUrl)

  if (!result) {
    return {
      name: 'Redirection HTTPS',
      category: 'https',
      passed: false,
      value: 'Timeout ou erreur',
      severity: 'high',
      description: 'Impossible de vérifier la redirection HTTP → HTTPS.'
    }
  }

  const redirectsToHttps = result.statusCode >= 300 && result.statusCode < 400
    && result.redirectUrl?.startsWith('https')

  return {
    name: 'Redirection HTTPS',
    category: 'https',
    passed: redirectsToHttps,
    value: redirectsToHttps
      ? `${result.statusCode} → ${result.redirectUrl}`
      : `${result.statusCode} (pas de redirection HTTPS)`,
    severity: 'high',
    description: redirectsToHttps
      ? 'Le site redirige correctement HTTP vers HTTPS.'
      : 'Le site ne redirige pas automatiquement vers HTTPS.'
  }
}

const checkCookies = (headers) => {
  const raw = headers['set-cookie']
  if (!raw) return []

  const cookies = Array.isArray(raw) ? raw : [raw]
  const results = []

  for (const cookie of cookies) {
    const name = cookie.split('=')[0].trim()
    const lower = cookie.toLowerCase()
    const hasSecure = lower.includes('secure')
    const hasHttpOnly = lower.includes('httponly')
    const hasSameSite = lower.includes('samesite')

    const issues = []
    if (!hasSecure) issues.push('Secure manquant')
    if (!hasHttpOnly) issues.push('HttpOnly manquant')
    if (!hasSameSite) issues.push('SameSite manquant')

    results.push({
      name: `Cookie: ${name}`,
      category: 'cookies',
      passed: issues.length === 0,
      value: issues.length ? issues.join(', ') : 'Secure, HttpOnly, SameSite',
      severity: issues.length ? 'medium' : 'info',
      description: issues.length
        ? `Le cookie "${name}" manque les flags : ${issues.join(', ')}.`
        : `Le cookie "${name}" a tous les flags de sécurité.`
    })
  }

  return results
}

const detectTechnologies = (headers) => {
  const techs = []
  const h = headers || {}

  if (h['server']) techs.push(h['server'])
  if (h['x-powered-by']) techs.push(h['x-powered-by'])
  if (h['x-aspnet-version']) techs.push(`ASP.NET ${h['x-aspnet-version']}`)
  if (h['x-drupal-cache']) techs.push('Drupal')
  if (h['x-generator']) techs.push(h['x-generator'])
  if (h['via']?.toLowerCase().includes('cloudflare')) techs.push('Cloudflare')
  if (h['server']?.toLowerCase().includes('nginx')) techs.push('Nginx')
  if (h['server']?.toLowerCase().includes('apache')) techs.push('Apache')
  if (h['x-vercel-id']) techs.push('Vercel')

  return [...new Set(techs)]
}

// ─── Score calculation ───────────────────────────────────────────

const calculateGrade = (checks) => {
  let score = 100

  for (const check of checks) {
    if (check.passed) continue
    switch (check.severity) {
      case 'critical': score -= 25; break
      case 'high': score -= 15; break
      case 'medium': score -= 8; break
      case 'low': score -= 3; break
    }
  }

  score = Math.max(0, score)

  if (score >= 90) return { score, grade: 'A' }
  if (score >= 75) return { score, grade: 'B' }
  if (score >= 60) return { score, grade: 'C' }
  if (score >= 40) return { score, grade: 'D' }
  return { score, grade: 'F' }
}

// ─── Main scan function ──────────────────────────────────────────

export const scanUrl = async (url) => {
  const start = Date.now()

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname
    const httpsUrl = url.startsWith('https') ? url : `https://${hostname}`

    // Anti-SSRF: reject internal/private targets
    await validateHostname(hostname)

    logger.info(`Starting scan for ${hostname}`)

    const [headersResult, sslChecks, httpsRedirect] = await Promise.all([
      fetchHeaders(httpsUrl),
      checkSsl(hostname),
      checkHttpsRedirect(hostname)
    ])

    const allChecks = []

    if (headersResult) {
      allChecks.push(...checkSecurityHeaders(headersResult.headers))
      allChecks.push(...checkCookies(headersResult.headers))
    } else {
      allChecks.push({
        name: 'Connexion HTTPS',
        category: 'https',
        passed: false,
        value: 'Impossible de se connecter',
        severity: 'critical',
        description: 'Le site ne répond pas en HTTPS.'
      })
    }

    allChecks.push(...sslChecks)
    allChecks.push(httpsRedirect)

    const technologies = headersResult ? detectTechnologies(headersResult.headers) : []
    const { score, grade } = calculateGrade(allChecks)
    const durationMs = Date.now() - start

    logger.info(`Scan completed for ${hostname}: grade ${grade} (${score}/100) in ${durationMs}ms`)

    return {
      url,
      hostname,
      grade,
      score,
      durationMs,
      technologies,
      checks: allChecks,
      summary: {
        total: allChecks.length,
        passed: allChecks.filter((c) => c.passed).length,
        failed: allChecks.filter((c) => !c.passed).length,
        critical: allChecks.filter((c) => !c.passed && c.severity === 'critical').length,
        high: allChecks.filter((c) => !c.passed && c.severity === 'high').length,
        medium: allChecks.filter((c) => !c.passed && c.severity === 'medium').length,
        low: allChecks.filter((c) => !c.passed && c.severity === 'low').length
      }
    }
  } catch (err) {
    logger.error(`Scan failed for ${url}: ${err.message}`)
    throw err
  }
}
