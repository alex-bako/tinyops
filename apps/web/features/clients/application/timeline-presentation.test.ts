import { describe, expect, it } from "vitest"

import {
  createTimelineEventView,
  createTimelineEventViews,
} from "@/features/clients/application/timeline-presentation"
import type { ClientTimelineEvent } from "@/features/clients/domain/client-profile"
import {
  createQaTimelineEventBody,
  createTextTimelineEventBody,
} from "@/features/clients/domain/timeline-event-body"

const event = (
  overrides: Partial<ClientTimelineEvent> = {}
): ClientTimelineEvent => ({
  id: "event_1",
  sourceId: "source_1",
  sourceType: "forms",
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

  it("maps body blocks and sensitivity for inline rendering", () => {
    expect(createTimelineEventView(event())).toMatchObject({
      title: "Monthly feedback",
      summary: "Goal: More confidence",
      bodyItems: [{ kind: "qa", question: "Goal", answer: "More confidence" }],
      sensitive: true,
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
      sourceLabel: "email",
    })
  })

  it("strips quoted reply history from email bodies", () => {
    const view = createTimelineEventView(
      event({
        id: "event_email",
        type: "email",
        body: createTextTimelineEventBody(
          "Thanks, that works.\nAlex <alex@example.com> wrote:\n> Can we move the meeting?"
        ),
        display: { title: "Re: Schedule", summary: "Thanks, that works." },
        sensitivityLevel: 0,
      })
    )

    expect(view.bodyItems).toEqual([
      { kind: "text", text: "Thanks, that works." },
    ])
  })

  it("formats domain event dates only at the presentation seam", () => {
    expect(createTimelineEventViews([event()])).toMatchObject([
      { date: "May 7" },
    ])
  })
})
