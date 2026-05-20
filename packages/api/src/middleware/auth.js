import { verifyAccessToken } from '../services/token.js'
import { AppError } from '../utils/errors.js'

// Vérifie l'access token JWT lu depuis le cookie httpOnly et expose req.user.
export const requireAuth = (req, res, next) => {
  try {
    const token = req.cookies?.accessToken
    if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Authentification requise')
    const payload = verifyAccessToken(token)
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch (err) {
    if (err instanceof AppError) return next(err)
    next(new AppError(401, 'INVALID_TOKEN', 'Session invalide ou expirée'))
  }
}
