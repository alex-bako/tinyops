import { describe, expect, it } from "vitest"

import type { GroundedAnswerData } from "@/features/ask/domain/grounded-answer"
import { buildHistoryTranscript, type AskThreadTurn } from "./ask-thread"

function turn(
  overrides: {
    id?: string
    question?: string
    askedBy?: string | null
    createdAt?: string
    answer?: Partial<GroundedAnswerData>
  } = {}
): AskThreadTurn {
  const answer: GroundedAnswerData = {
    question: overrides.question ?? "What has Anna asked for?",
    lead: "Mostly *practical access*.",
    body: "She asks about **logistics**.",
    scope: "Grounded in 9 events for Anna",
    confidencePct: 86,
    sources: [],
    followUps: [],
    ...overrides.answer,
  }
  return {
    id: overrides.id ?? "turn_1",
    question: overrides.question ?? "What has Anna asked for?",
    askedBy: overrides.askedBy ?? "Alex Bako",
    createdAt: overrides.createdAt ?? "2026-06-18T10:00:00.000Z",
    answer,
  }
}

describe("buildHistoryTranscript", () => {
  it("returns an empty string when there are no prior turns", () => {
    expect(buildHistoryTranscript([])).toBe("")
  })

  it("renders each turn as a compact Q/A pair using lead + body only", () => {
    const transcript = buildHistoryTranscript([turn()])

    expect(transcript).toBe(
      "Q: What has Anna asked for?\nA: Mostly *practical access*. She asks about **logistics**."
    )
    // No sources/confidence/scope blob leaks into the transcript.
    expect(transcript).not.toContain("Grounded in")
    expect(transcript).not.toContain("86")
  })

  it("separates multiple turns with a blank line, in order", () => {
    const transcript = buildHistoryTranscript([
      turn({ id: "t1", question: "Q one", answer: { lead: "Lead one", body: "Body one" } }),
      turn({ id: "t2", question: "Q two", answer: { lead: "Lead two", body: "Body two" } }),
    ])

    expect(transcript).toBe(
      "Q: Q one\nA: Lead one Body one\n\nQ: Q two\nA: Lead two Body two"
    )
  })

  it("tolerates a turn whose answer has an empty body", () => {
    const transcript = buildHistoryTranscript([
      turn({ question: "Q", answer: { lead: "Just a lead.", body: "" } }),
    ])

    expect(transcript).toBe("Q: Q\nA: Just a lead.")
  })
})
