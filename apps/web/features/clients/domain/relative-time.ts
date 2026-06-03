const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

function plural(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`
}

/**
 * Human relative time ("just now", "2 days ago"). `now` is injected so callers
 * can render deterministically and tests can pin the clock. Must be computed
 * client-side — rendering it on the server risks a hydration mismatch.
 */
export function formatRelativeTime(fromISO: string, now: Date): string {
  const then = new Date(fromISO)
  if (Number.isNaN(then.getTime())) return ""

  const seconds = Math.round((now.getTime() - then.getTime()) / 1000)
  if (seconds < 45) return "just now"
  if (seconds < HOUR) return plural(Math.round(seconds / MINUTE), "minute")
  if (seconds < DAY) return plural(Math.round(seconds / HOUR), "hour")
  if (seconds < WEEK) return plural(Math.round(seconds / DAY), "day")
  if (seconds < MONTH) return plural(Math.round(seconds / WEEK), "week")
  if (seconds < YEAR) return plural(Math.round(seconds / MONTH), "month")
  return plural(Math.round(seconds / YEAR), "year")
}
