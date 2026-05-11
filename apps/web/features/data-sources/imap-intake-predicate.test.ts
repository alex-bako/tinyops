import { describe, expect, it } from "vitest"

import { matchesImapSkipSender } from "@/features/data-sources/imap-intake-predicate"

describe("IMAP intake predicate", () => {
  it("matches exact and wildcard skip sender patterns in one shared predicate", () => {
    expect(
      matchesImapSkipSender(["notifications@example.com"], [
        "notifications@example.com",
      ])
    ).toBe(true)
    expect(
      matchesImapSkipSender(["*@example.com"], ["updates@example.com"])
    ).toBe(true)
    expect(
      matchesImapSkipSender(["alerts+vip@example.com"], [
        "alerts+vip@example.com",
      ])
    ).toBe(true)
    expect(matchesImapSkipSender(["alerts+*@example.com"], ["alerts@example.com"]))
      .toBe(false)
  })
})
