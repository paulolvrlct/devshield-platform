import { logger } from './logger.js'

// Erreur applicative avec code et statut HTTP explicites.
export class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Ressource introuvable' }
  })
}

// Le 4e paramètre `next` est requis pour qu'Express reconnaisse ce middleware d'erreur.
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500
  const code = err.code || 'INTERNAL_ERROR'

  if (statusCode >= 500) {
    logger.error(`${code}: ${err.message}`)
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: statusCode >= 500 ? 'Une erreur interne est survenue' : err.message
    }
  })
}
