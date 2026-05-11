import { describe, expect, it } from "vitest"

import {
  createTimelineEventView,
  createTimelineEventViews,
} from "@/features/clients/application/timeline-presentation"
import type { ClientTimelineEvent } from "@/features/clients/domain/client-profile"

const event = (
  overrides: Partial<ClientTimelineEvent> = {}
): ClientTimelineEvent => ({
  id: "event_1",
  sourceId: "source_1",
  type: "form",
  occurredAt: "2026-05-07T08:00:00.000Z",
  title: "Monthly feedback",
  summary: "Shared progress update.",
  bodyText: " Full sensitive form body. ",
  sensitivityLevel: 2,
  ...overrides,
})

describe("timeline event presentation", () => {
  it("uses persisted Timeline Event identity as the UI key", () => {
    expect(createTimelineEventView(event()).eventKey).toBe("event_1")
  })

  it("centralizes detail fallback and sensitive reveal labels", () => {
    expect(createTimelineEventView(event())).toMatchObject({
      detailText: "Full sensitive form body.",
      sensitive: true,
      collapsedLabel: "Show sensitive event",
      expandedLabel: "Hide sensitive event",
      sourceLabel: "form · sensitive",
    })

    expect(
      createTimelineEventView(
        event({
          id: "event_2",
          type: "email",
          bodyText: "   ",
          sensitivityLevel: 0,
        })
      )
    ).toMatchObject({
      detailText: "Shared progress update.",
      sensitive: false,
      collapsedLabel: "Show full event",
      expandedLabel: "Hide full event",
      sourceLabel: "email",
    })
  })

  it("formats domain event dates only at the presentation seam", () => {
    expect(createTimelineEventViews([event()])).toMatchObject([
      { date: "May 7" },
    ])
  })
})
