const STORAGE_KEY = 'choyeon_error_logs'
const MAX_LOGS = 500

let errorLogs = []

const loadLogs = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      errorLogs = JSON.parse(raw)
    }
  } catch {
    errorLogs = []
  }
}

const saveLogs = () => {
  try {
    if (errorLogs.length > MAX_LOGS) {
      errorLogs = errorLogs.slice(-MAX_LOGS)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errorLogs))
  } catch {
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

const captureError = (error, context = {}) => {
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
