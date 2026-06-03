import { describe, expect, it } from "vitest"

import {
  createNoteView,
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
  parentEventId: null,
  author: null,
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

  it("renders manual notes with a 'note' label, neutral tone, and no redundant title", () => {
    const view = createTimelineEventView(
      event({
        id: "event_note",
        type: "note",
        sourceId: null,
        sourceType: null,
        body: createTextTimelineEventBody("Called to confirm Tuesday session."),
        display: { title: "Manual note", summary: "Called to confirm Tuesday session." },
        sensitivityLevel: 0,
      })
    )

    expect(view).toMatchObject({
      title: "",
      tone: "neutral",
      sourceLabel: "note",
      bodyItems: [{ kind: "text", text: "Called to confirm Tuesday session." }],
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

describe("note view presentation", () => {
  it("shapes a note with author, parent link, and an SSR-safe date", () => {
    const view = createNoteView(
      event({
        id: "note_1",
        type: "note",
        parentEventId: "event_1",
        author: { id: "user_1", name: "Jamie Park" },
        body: createTextTimelineEventBody("Confirm replay access first."),
      })
    )

    expect(view).toEqual({
      id: "note_1",
      text: "Confirm replay access first.",
      dateLabel: "May 7",
      occurredAt: "2026-05-07T08:00:00.000Z",
      parentEventId: "event_1",
      author: { name: "Jamie Park" },
    })
  })

  it("leaves author null when the note has no recorded creator", () => {
    const view = createNoteView(
      event({
        type: "note",
        author: null,
        body: createTextTimelineEventBody("Legacy note."),
      })
    )

    expect(view.author).toBeNull()
  })
})
