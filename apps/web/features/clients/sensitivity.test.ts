import { describe, expect, it } from "vitest"

import { classifyTimelineSensitivity } from "@/features/clients/domain/sensitivity"

describe("client sensitivity classifier", () => {
  it("flags manual-review keywords case-insensitively", () => {
    expect(
      classifyTimelineSensitivity({
        text: "This mentions Trauma context from an intake answer.",
        manualReviewKeywords: ["trauma", "crisis"],
      })
    ).toEqual({ level: 2, matchedKeywords: ["trauma"] })
  })

  it("returns non-sensitive when no keyword matches", () => {
    expect(
      classifyTimelineSensitivity({
        text: "Could you resend the replay library link?",
        manualReviewKeywords: ["trauma", "crisis"],
      })
    ).toEqual({ level: 0, matchedKeywords: [] })
  })
})
