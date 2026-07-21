const STORAGE_KEY = 'choyeon_error_logs'
const MAX_LOGS = 500

let errorLogs = []

const loadLogs = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      errorLogs = JSON.parse(raw)
    }
  } catch (e) {
    errorLogs = []
  }
}

const saveLogs = () => {
  try {
    if (errorLogs.length > MAX_LOGS) {
      errorLogs = errorLogs.slice(-MAX_LOGS)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errorLogs))
  } catch (e) {
    // ignore
  }
}

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const normalizeError = (error) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  }
  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
      stack: null
    }
  }
  return {
    name: 'UnknownError',
    message: String(error),
    stack: null
  }
}

export const captureError = (error, context = {}) => {
  const errInfo = normalizeError(error)
  const log = {
    id: generateId(),
    timestamp: Date.now(),
    type: context.type || 'runtime',
    name: errInfo.name,
    message: errInfo.message,
    stack: errInfo.stack,
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    ...context
  }

  errorLogs.unshift(log)
  saveLogs()

  if (process.env.NODE_ENV !== 'production') {
    console.warn('[ErrorMonitor]', errInfo.name, errInfo.message)
  }

  return log
}

export const getErrorLogs = (filters = {}) => {
  let logs = [...errorLogs]

  if (filters.type) {
    logs = logs.filter((l) => l.type === filters.type)
  }
  if (filters.level) {
    logs = logs.filter((l) => (l.level || 'error') === filters.level)
  }
  if (filters.startTime) {
    logs = logs.filter((l) => l.timestamp >= filters.startTime)
  }
  if (filters.endTime) {
    logs = logs.filter((l) => l.timestamp <= filters.endTime)
  }
  if (filters.search) {
    const q = filters.search.toLowerCase()
    logs = logs.filter(
      (l) => l.message.toLowerCase().includes(q) || l.name.toLowerCase().includes(q)
    )
  }

  return logs
}

export const getErrorStats = () => {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  const oneHour = 60 * 60 * 1000

  const last24h = errorLogs.filter((l) => now - l.timestamp < oneDay)
  const last1h = errorLogs.filter((l) => now - l.timestamp < oneHour)

  const typeCount = {}
  errorLogs.forEach((l) => {
    typeCount[l.type] = (typeCount[l.type] || 0) + 1
  })

  const uniqueErrors = new Map()
  errorLogs.forEach((l) => {
    const key = `${l.name}:${l.message}`
    if (!uniqueErrors.has(key)) {
      uniqueErrors.set(key, { name: l.name, message: l.message, count: 0, lastSeen: 0 })
    }
    const entry = uniqueErrors.get(key)
    entry.count++
    if (l.timestamp > entry.lastSeen) entry.lastSeen = l.timestamp
  })

  const topErrors = Array.from(uniqueErrors.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    total: errorLogs.length,
    last24h: last24h.length,
    last1h: last1h.length,
    typeCount,
    topErrors
  }
}

export const clearErrorLogs = () => {
  errorLogs = []
  saveLogs()
}

export const deleteErrorLog = (id) => {
  errorLogs = errorLogs.filter((l) => l.id !== id)
  saveLogs()
}

export const setupErrorMonitoring = (app) => {
  loadLogs()

  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    captureError(event.error || event.message, {
      type: 'window-error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, {
      type: 'unhandled-promise-rejection'
    })
  })

  if (app && app.config) {
    const originalHandler = app.config.errorHandler
    app.config.errorHandler = (err, instance, info) => {
      captureError(err, {
        type: 'vue-error',
        component: instance?.$options?.name || instance?.type?.name || 'unknown',
        info
      })
      if (originalHandler) {
        originalHandler(err, instance, info)
      }
    }
  }
}

loadLogs()
