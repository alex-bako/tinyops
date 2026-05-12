import { describe, expect, it } from "vitest"

import {
  createQaTimelineEventBody,
  createTextTimelineEventBody,
  isValidTimelineEventBody,
  timelineEventBodyToText,
} from "@/features/clients/domain/timeline-event-body"

describe("Timeline Event body domain", () => {
  it("normalizes text bodies behind one constructor", () => {
    expect(createTextTimelineEventBody("  Line one\n\nLine two  ")).toEqual({
      text: "Line one\n\nLine two",
      blocks: [{ kind: "text", text: "Line one\n\nLine two" }],
    })
  })

  it("keeps arbitrary Google Form questions while normalizing blank answers away", () => {
    expect(
      createQaTimelineEventBody([
        { question: "Goal", answer: " More confidence " },
        { question: "Anything else?", answer: " " },
        { question: "Blocker", answer: "Consistency" },
      ])
    ).toEqual({
      text: "Goal: More confidence\nBlocker: Consistency",
      blocks: [
        { kind: "qa", question: "Goal", answer: "More confidence" },
        { kind: "qa", question: "Blocker", answer: "Consistency" },
      ],
    })
  })

  it("rejects malformed and empty body blocks", () => {
    expect(
      isValidTimelineEventBody({
        text: "Goal",
        blocks: [{ kind: "qa", question: "Goal" }],
      })
    ).toBe(false)
    expect(
      isValidTimelineEventBody({
        text: "Goal",
        blocks: [{ kind: "text", text: "   " }],
      })
    ).toBe(false)
    expect(
      isValidTimelineEventBody({
        text: "Goal",
        blocks: [{ kind: "table", rows: [] }],
      })
    ).toBe(false)
  })

  it("derives canonical text from supported block shapes", () => {
    expect(
      timelineEventBodyToText({
        text: "stale",
        blocks: [
          { kind: "qa", question: "Goal", answer: "More confidence" },
          { kind: "text", text: "Follow-up note" },
        ],
      })
    ).toBe("Goal: More confidence\nFollow-up note")
  })
})
