import { describe, expect, it } from "vitest"

import {
  historyWindowToQuery,
  initialBackfillCursor,
  parseGmailCursor,
  reBackfillQuery,
} from "@/features/data-sources/gmail/gmail-cursor"

describe("gmail cursor", () => {
  it("maps history windows to Gmail search queries", () => {
    expect(historyWindowToQuery("30d")).toBe("newer_than:30d")
    expect(historyWindowToQuery("90d")).toBe("newer_than:90d")
    expect(historyWindowToQuery("12mo")).toBe("newer_than:1y")
    expect(historyWindowToQuery("all")).toBeNull()
  })

  it("seeds an initial backfill cursor from the history window", () => {
    expect(initialBackfillCursor("90d")).toEqual({
      phase: "backfill",
      pageToken: null,
      baselineHistoryId: null,
      query: "newer_than:90d",
    })
  })

  it("parses a stored incremental cursor", () => {
    expect(parseGmailCursor({ phase: "incremental", historyId: "555" })).toEqual({
      phase: "incremental",
      historyId: "555",
    })
  })

  it("parses a stored backfill cursor and ignores malformed fields", () => {
    expect(
      parseGmailCursor({ phase: "backfill", pageToken: "p1", baselineHistoryId: 9, query: "newer_than:30d" })
    ).toEqual({
      phase: "backfill",
      pageToken: "p1",
      baselineHistoryId: null,
      query: "newer_than:30d",
    })
  })

  it("returns null for absent or unrecognised cursors", () => {
    expect(parseGmailCursor(null)).toBeNull()
    expect(parseGmailCursor({ phase: "nope" })).toBeNull()
  })

  it("computes a bounded re-backfill window from the last sync", () => {
    const now = new Date("2026-06-15T00:00:00.000Z")
    expect(reBackfillQuery("2026-06-05T00:00:00.000Z", now)).toBe("newer_than:11d")
    expect(reBackfillQuery(null, now)).toBe("newer_than:30d")
  })
})
