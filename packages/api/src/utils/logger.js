const levels = ['error', 'warn', 'info', 'debug']

const currentLevel = process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

const shouldLog = (level) => levels.indexOf(level) <= levels.indexOf(currentLevel)

const format = (level, message) => {
  const timestamp = new Date().toISOString()
  return `[${timestamp}] ${level.toUpperCase()} ${message}`
}

export const logger = {
  error: (msg) => { if (shouldLog('error')) process.stderr.write(`${format('error', msg)}\n`) },
  warn: (msg) => { if (shouldLog('warn')) process.stdout.write(`${format('warn', msg)}\n`) },
  info: (msg) => { if (shouldLog('info')) process.stdout.write(`${format('info', msg)}\n`) },
  debug: (msg) => { if (shouldLog('debug')) process.stdout.write(`${format('debug', msg)}\n`) }
}
