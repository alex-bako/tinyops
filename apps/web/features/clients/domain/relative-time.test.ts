import { describe, expect, it } from "vitest"

import { formatRelativeTime } from "@/features/clients/domain/relative-time"

const NOW = new Date("2026-06-03T12:00:00.000Z")

function ago(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString()
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe("formatRelativeTime", () => {
  it("treats anything within ~45s as just now", () => {
    expect(formatRelativeTime(ago(10 * SECOND), NOW)).toBe("just now")
    expect(formatRelativeTime(ago(0), NOW)).toBe("just now")
  })

  it("formats minutes, hours, and days with correct pluralisation", () => {
    expect(formatRelativeTime(ago(1 * MINUTE), NOW)).toBe("1 minute ago")
    expect(formatRelativeTime(ago(5 * MINUTE), NOW)).toBe("5 minutes ago")
    expect(formatRelativeTime(ago(1 * HOUR), NOW)).toBe("1 hour ago")
    expect(formatRelativeTime(ago(1 * DAY), NOW)).toBe("1 day ago")
    expect(formatRelativeTime(ago(2 * DAY), NOW)).toBe("2 days ago")
  })

  it("rolls up into weeks, months, and years", () => {
    expect(formatRelativeTime(ago(10 * DAY), NOW)).toBe("1 week ago")
    expect(formatRelativeTime(ago(40 * DAY), NOW)).toBe("1 month ago")
    expect(formatRelativeTime(ago(400 * DAY), NOW)).toBe("1 year ago")
  })

  it("clamps future timestamps to just now and ignores invalid input", () => {
    expect(formatRelativeTime(ago(-5 * MINUTE), NOW)).toBe("just now")
    expect(formatRelativeTime("not-a-date", NOW)).toBe("")
  })
})
