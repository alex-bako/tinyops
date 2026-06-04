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
        sourceType: "imap",
        type: "email",
        occurredAt: "2026-03-08T00:00:00.000Z",
        display: {
          title: "Replay access",
          summary: "Full imported email body.",
        },
        body: createTextTimelineEventBody("Full imported email body."),
        sensitivityLevel: 0,
        parentEventId: null,
        author: null,
      },
      {
        id: "event_form",
        sourceId: "source_2",
        sourceType: "forms",
        type: "form",
        occurredAt: "2026-03-03T00:00:00.000Z",
        display: {
          title: "Intake form",
          summary: "No body text",
        },
        body: { text: "", blocks: [] },
        sensitivityLevel: 2,
        parentEventId: null,
        author: null,
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

  it("routes standalone notes to the Notes section, out of the timeline", () => {
    const timeline: ClientTimelineEvent[] = [
      {
        id: "event_email",
        sourceId: "source_1",
        sourceType: "imap",
        type: "email",
        occurredAt: "2026-06-02T00:00:00.000Z",
        display: { title: "Replay access", summary: "Body." },
        body: createTextTimelineEventBody("Body."),
        sensitivityLevel: 0,
        parentEventId: null,
        author: null,
      },
      {
        id: "event_note",
        sourceId: null,
        sourceType: null,
        type: "note",
        occurredAt: "2026-06-03T00:00:00.000Z",
        display: { title: "Manual note", summary: "Called to confirm." },
        body: createTextTimelineEventBody("Called to confirm."),
        sensitivityLevel: 0,
        parentEventId: null,
        author: { id: "user_jamie", name: "Jamie Park" },
      },
    ]
    const client = { ...clientBySlug("anna-smith")!, id: "client_123", timeline }

    const view = createClientDetailView(client)

    expect(view.clientId).toBe("client_123")
    expect(view.notes).toEqual([
      {
        id: "event_note",
        text: "Called to confirm.",
        dateLabel: "Jun 3",
        occurredAt: "2026-06-03T00:00:00.000Z",
        parentEventId: null,
        author: { name: "Jamie Park" },
      },
    ])
    // The note is NOT a timeline event — it lives only in the Notes section.
    expect(view.timeline.map((event) => event.eventKey)).not.toContain(
      "event_note"
    )
    expect(view.timelineCount).toBe("1 events")
  })

  it("groups notes pinned to an event under that event only", () => {
    const timeline: ClientTimelineEvent[] = [
      {
        id: "event_email",
        sourceId: "source_1",
        sourceType: "imap",
        type: "email",
        occurredAt: "2026-06-02T00:00:00.000Z",
        display: { title: "Replay access", summary: "Body." },
        body: createTextTimelineEventBody("Body."),
        sensitivityLevel: 0,
        parentEventId: null,
        author: null,
      },
      {
        id: "event_pinned_note",
        sourceId: null,
        sourceType: null,
        type: "note",
        occurredAt: "2026-06-03T00:00:00.000Z",
        display: { title: "Manual note", summary: "Check she logged in." },
        body: createTextTimelineEventBody("Check she logged in."),
        sensitivityLevel: 0,
        parentEventId: "event_email",
        author: { id: "user_jamie", name: "Jamie Park" },
      },
    ]
    const client = { ...clientBySlug("anna-smith")!, id: "client_9", timeline }

    const view = createClientDetailView(client)

    // Pinned note: only under its parent, never in the Notes section or timeline.
    expect(view.notes).toEqual([])
    expect(view.timeline.map((event) => event.eventKey)).toEqual(["event_email"])
    expect(view.eventNotes.event_email).toMatchObject([
      { id: "event_pinned_note", text: "Check she logged in." },
    ])
  })

  it("computes the timeline count from source events only", () => {
    const client = clientBySlug("anna-smith")!
    const view = createClientDetailView(client)

    expect(view.timelineCount).toBe("5 events")
  })
})
