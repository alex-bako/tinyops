import { describe, expect, it } from "vitest"

import { clientBySlug } from "@/features/clients/adapters/mock-client-memory"
import type { ClientTimelineEvent } from "@/features/clients/domain/client-profile"
import { createTextTimelineEventBody } from "@/features/clients/domain/timeline-event-body"

import { createClientDetailView } from "./_view-model"

describe("client detail view model", () => {
  it("derives header badges from client state", () => {
    const client = clientBySlug("anna-smith")!
    const view = createClientDetailView(client)

    expect(view.header.badges.map((badge) => badge.label)).toEqual([
      "Active",
      "March cohort",
      "Overdue check-in",
    ])
  })

  it("formats memory confidence for display", () => {
    const client = clientBySlug("anna-smith")!
    const view = createClientDetailView(client)

    expect(view.memory.confidencePct).toBe(78)
    expect(view.memory.confidenceWidth).toBe("78%")
  })

  it("maps timeline source labels and tones", () => {
    const client = clientBySlug("anna-smith")!
    const view = createClientDetailView(client)

    expect(view.timeline[0]).toMatchObject({
      tone: "brand",
      sourceLabel: "email",
    })
    expect(view.timeline[1]).toMatchObject({
      tone: "positive",
      sourceLabel: "form · sensitive",
      sensitive: true,
    })
  })

  it("prepares full timeline event details for inline expansion", () => {
    const timeline: ClientTimelineEvent[] = [
      {
        id: "event_email",
        sourceId: "source_1",
        type: "email",
        occurredAt: "2026-03-08T00:00:00.000Z",
        display: {
          title: "Replay access",
          summary: "Full imported email body.",
        },
        body: createTextTimelineEventBody("Full imported email body."),
        sensitivityLevel: 0,
      },
      {
        id: "event_form",
        sourceId: "source_2",
        type: "form",
        occurredAt: "2026-03-03T00:00:00.000Z",
        display: {
          title: "Intake form",
          summary: "No body text",
        },
        body: { text: "", blocks: [] },
        sensitivityLevel: 2,
      },
    ]
    const client = {
      ...clientBySlug("anna-smith")!,
      timeline,
    }

    const view = createClientDetailView(client)

    expect(view.timeline[0]).toMatchObject({
      eventKey: "event_email",
      title: "Replay access",
      summary: "Full imported email body.",
      bodyItems: [{ kind: "text", text: "Full imported email body." }],
    })
    expect(view.timeline[1]).toMatchObject({
      eventKey: "event_form",
      title: "Intake form",
      summary: "No body text",
      sensitive: true,
    })
  })

  it("computes detail section counts", () => {
    const client = clientBySlug("anna-smith")!
    const view = createClientDetailView(client)

    expect(view.propertiesCount).toBe("10 fields")
    expect(view.timelineCount).toBe("5 events")
  })
})
