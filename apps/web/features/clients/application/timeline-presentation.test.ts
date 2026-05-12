import { describe, expect, it } from "vitest"

import {
  createTimelineEventView,
  createTimelineEventViews,
} from "@/features/clients/application/timeline-presentation"
import type { ClientTimelineEvent } from "@/features/clients/domain/client-profile"
import { createQaTimelineEventBody } from "@/features/clients/domain/timeline-event-body"

const event = (
  overrides: Partial<ClientTimelineEvent> = {}
): ClientTimelineEvent => ({
  id: "event_1",
  sourceId: "source_1",
  type: "form",
  occurredAt: "2026-05-07T08:00:00.000Z",
  body: createQaTimelineEventBody([
    { question: "Goal", answer: "More confidence" },
  ]),
  display: {
    title: "Monthly feedback",
    summary: "Goal: More confidence",
  },
  sensitivityLevel: 2,
  ...overrides,
})

describe("timeline event presentation", () => {
  it("uses persisted Timeline Event identity as the UI key", () => {
    expect(createTimelineEventView(event()).eventKey).toBe("event_1")
  })

  it("centralizes detail fallback and sensitive reveal labels", () => {
    expect(createTimelineEventView(event())).toMatchObject({
      title: "Monthly feedback",
      summary: "Goal: More confidence",
      bodyItems: [{ kind: "qa", question: "Goal", answer: "More confidence" }],
      sensitive: true,
      collapsedLabel: "Show sensitive body",
      expandedLabel: "Hide sensitive body",
      sourceLabel: "form · sensitive",
    })

    expect(
      createTimelineEventView(
        event({
          id: "event_2",
          type: "email",
          body: { text: "", blocks: [] },
          display: {
            title: "Replay access",
            summary: "No body text",
          },
          sensitivityLevel: 0,
        })
      )
    ).toMatchObject({
      title: "Replay access",
      summary: "No body text",
      sensitive: false,
      collapsedLabel: "Show body",
      expandedLabel: "Hide body",
      sourceLabel: "email",
    })
  })

  it("formats domain event dates only at the presentation seam", () => {
    expect(createTimelineEventViews([event()])).toMatchObject([
      { date: "May 7" },
    ])
  })
})
