import pino, {
  type DestinationStream,
  type Logger as PinoLogger,
} from "pino"

type LogContext = Record<string, unknown>
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent"

export type LoggerPort = {
  child(bindings: LogContext): LoggerPort
  debug(context: LogContext, message?: string): void
  info(context: LogContext, message?: string): void
  warn(context: LogContext, message?: string): void
  error(context: LogContext, message?: string): void
}

type CreateLoggerInput = {
  name?: string
  level?: LogLevel
  destination?: DestinationStream
}

const REDACTED = "[Redacted]"
const SECRET_KEY_PATTERN =
  /password|passphrase|token|secret|authorization|cookie|api[_-]?key|service[_-]?role|decrypted[_-]?secret/i

let singletonLogger: LoggerPort | null = null

export function getLogger() {
  singletonLogger ??= createLogger()
  return singletonLogger
}

export function createLogger({
  name = "tinyops",
  level = configuredLogLevel(),
  destination,
}: CreateLoggerInput = {}): LoggerPort {
  const logger = pino(
    {
      name,
      level,
      base: { name },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label) {
          return { severity: label.toUpperCase() }
        },
      },
      serializers: {
        err: pino.stdSerializers.err,
      },
      redact: {
        paths: [
          "password",
          "*.password",
          "*.*.password",
          "token",
          "*.token",
          "*.*.token",
          "secret",
          "*.secret",
          "*.*.secret",
          "authorization",
          "*.authorization",
          "*.*.authorization",
          "apiKey",
          "*.apiKey",
          "*.*.apiKey",
          "api_key",
          "*.api_key",
          "*.*.api_key",
        ],
        censor: REDACTED,
      },
    },
    destination
  )

  return wrapPinoLogger(logger)
}

export function createNoopLogger(): LoggerPort {
  return {
    child: () => createNoopLogger(),
    debug() {},
    info() {},
    warn() {},
    error() {},
  }
}

function wrapPinoLogger(logger: PinoLogger): LoggerPort {
  return {
    child(bindings) {
      return wrapPinoLogger(logger.child(sanitizeContext(bindings)))
    },
    debug(context, message) {
      logger.debug(sanitizeContext(context), message)
    },
    info(context, message) {
      logger.info(sanitizeContext(context), message)
    },
    warn(context, message) {
      logger.warn(sanitizeContext(context), message)
    },
    error(context, message) {
      logger.error(sanitizeContext(context), message)
    },
  }
}

function configuredLogLevel(): LogLevel {
  const value = process.env.TINYOPS_LOG_LEVEL?.trim().toLowerCase()
  if (isLogLevel(value)) return value
  return process.env.NODE_ENV === "production" ? "info" : "debug"
}

function isLogLevel(value: string | undefined): value is LogLevel {
  return (
    value === "trace" ||
    value === "debug" ||
    value === "info" ||
    value === "warn" ||
    value === "error" ||
    value === "fatal" ||
    value === "silent"
  )
}

function sanitizeContext(context: LogContext): LogContext {
  return sanitizeValue(context) as LogContext
}

function sanitizeValue(value: unknown, key = ""): unknown {
  if (SECRET_KEY_PATTERN.test(key)) return REDACTED
  if (value instanceof Error) return sanitizeError(value)
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item))
  if (!value || typeof value !== "object") return value

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      sanitizeValue(entryValue, entryKey),
    ])
  )
}

function sanitizeError(error: Error) {
  return {
    type: error.name,
    message: SECRET_KEY_PATTERN.test(error.message) ? REDACTED : error.message,
    stack: error.stack,
  }
}
