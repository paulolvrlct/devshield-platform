import { AppError } from '../utils/errors.js'

// Valide req.body avec un schéma Zod. Renvoie 400 au premier champ invalide.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    const issue = result.error.issues[0]
    const field = issue.path.join('.') || 'body'
    return next(new AppError(400, 'VALIDATION_ERROR', `${field} : ${issue.message}`))
  }
  req.body = result.data
  next()
}
