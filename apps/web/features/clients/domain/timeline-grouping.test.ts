import { describe, expect, it } from "vitest"

import type { ClientTimelineEvent } from "@/features/clients/domain/client-profile"
import { createTextTimelineEventBody } from "@/features/clients/domain/timeline-event-body"
import { partitionTimeline } from "@/features/clients/domain/timeline-grouping"

function event(overrides: Partial<ClientTimelineEvent> = {}): ClientTimelineEvent {
  return {
    id: "event_1",
    sourceId: null,
    sourceType: null,
    type: "email",
    occurredAt: "2026-06-03T00:00:00.000Z",
    display: { title: "Subject", summary: "Summary" },
    body: createTextTimelineEventBody("Body"),
    sensitivityLevel: 0,
    parentEventId: null,
    author: null,
    ...overrides,
  }
}

describe("partitionTimeline", () => {
  it("keeps source events in the timeline and standalone notes out of it", () => {
    const email = event({ id: "email_1", type: "email" })
    const standalone = event({ id: "note_1", type: "note", parentEventId: null })

    const { sourceEvents, standaloneNotes, notesByParent } = partitionTimeline([
      email,
      standalone,
    ])

    expect(sourceEvents.map((e) => e.id)).toEqual(["email_1"])
    expect(standaloneNotes.map((e) => e.id)).toEqual(["note_1"])
    expect(notesByParent.size).toBe(0)
  })

  it("groups pinned notes by parent and excludes them from both other surfaces", () => {
    const email = event({ id: "email_1", type: "email" })
    // Input is newest-first; grouped notes come back oldest-first.
    const newerNote = event({
      id: "note_newer",
      type: "note",
      parentEventId: "email_1",
      occurredAt: "2026-06-03T00:00:00.000Z",
    })
    const olderNote = event({
      id: "note_older",
      type: "note",
      parentEventId: "email_1",
      occurredAt: "2026-06-01T00:00:00.000Z",
    })

    const { sourceEvents, standaloneNotes, notesByParent } = partitionTimeline([
      email,
      newerNote,
      olderNote,
    ])

    expect(sourceEvents.map((e) => e.id)).toEqual(["email_1"])
    expect(standaloneNotes).toEqual([])
    expect(notesByParent.get("email_1")?.map((e) => e.id)).toEqual([
      "note_older",
      "note_newer",
    ])
  })
})
