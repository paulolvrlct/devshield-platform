// Wrapper fetch : envoie les cookies, lit l'enveloppe { success, data, error }
// et tente un refresh automatique une seule fois en cas de réponse 401.
const request = async (path, options = {}, retry = true) => {
  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'same-origin'
  })

  const refreshable = retry && path !== '/auth/refresh' && path !== '/auth/login'
  if (res.status === 401 && refreshable) {
    const refreshed = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin'
    })
    if (refreshed.ok) return request(path, options, false)
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.success === false) {
    throw new Error(body?.error?.message || 'Une erreur est survenue')
  }
  return body.data
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data ?? {}) }),
  put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data ?? {}) })
}
