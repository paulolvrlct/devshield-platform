import rateLimit from 'express-rate-limit'

const limitResponse = (message) => ({
  success: false,
  error: { code: 'RATE_LIMITED', message }
})

// Limite générale : 100 requêtes / minute / IP.
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitResponse('Trop de requêtes, réessayez dans une minute')
})

// Limite stricte sur l'authentification : 10 tentatives / 15 minutes / IP.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitResponse('Trop de tentatives de connexion, réessayez plus tard')
})

// Limite sur les soumissions onboarding : 5 / heure / IP (anti-spam).
export const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitResponse('Trop de soumissions, réessayez plus tard')
})

// Limite stricte sur les scans OWASP : 10 scans / minute / IP.
export const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.SCAN_RATE_LIMIT) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitResponse('Trop de scans, réessayez dans une minute')
})
