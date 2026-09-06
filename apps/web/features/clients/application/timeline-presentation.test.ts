import { describe, expect, it } from "vitest"

import {
  groupTimelineEvents,
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
  it.each(["stripe", "mailerlite", "forms", "imap", "csv", "unknown", null])(
    "preserves source identity %s for rendering",
    (sourceType) => {
      expect(createTimelineEventView(event({ sourceType })).sourceType).toBe(sourceType)
    }
  )

  it("formats timestamp answers without changing persisted data, prose, or tags", () => {
    const timestamp = "2026-09-06T04:37:26.000Z"
    const source = event({
      occurredAt: timestamp,
      body: {
        text: `Subscribed: ${timestamp}`,
        blocks: [
          { kind: "qa", question: "Subscribed", answer: timestamp },
          { kind: "qa", question: "Offset", answer: "2026-09-06T00:37:26+02:00" },
          { kind: "qa", question: "Invalid", answer: "2026-02-30T04:37:26.000Z" },
          { kind: "qa", question: "ID", answer: "197834253867680809" },
          { kind: "qa", question: "Phone", answer: "06702316693" },
          { kind: "text", text: timestamp },
          { kind: "tags", label: "Groups", values: [timestamp] },
        ],
      },
    })
    const original = structuredClone(source)
    const view = createTimelineEventView(source)

    expect(view.date).toBe("Sep 6, 2026, 04:37 UTC")
    expect(view.bodyItems).toEqual([
      { kind: "qa", question: "Subscribed", answer: "Sep 6, 2026, 04:37 UTC" },
      { kind: "qa", question: "Offset", answer: "Sep 5, 2026, 22:37 UTC" },
      ...source.body.blocks.slice(2),
    ])
    expect(source).toEqual(original)
  })

  it.each(["2026-09-06T14:21:26.000Z", "2026-09-06T16:21:26+02:00"])(
    "removes redundant MailerLite fields for %s while preserving groups and source data",
    (subscribedAt) => {
      const groups = { kind: "tags" as const, label: "Groups", values: ["Webinar", "Newsletter"] }
      const source = event({
        sourceType: "mailerlite",
        type: "added",
        occurredAt: "2026-09-06T14:21:26.000Z",
        body: {
          text: "Status: active",
          blocks: [
            { kind: "qa", question: "Status", answer: "active" },
            { kind: "qa", question: "Subscribed", answer: subscribedAt },
            groups,
          ],
        },
      })
      const original = structuredClone(source)
      expect(createTimelineEventView(source)).toMatchObject({
        date: "Sep 6, 2026, 14:21 UTC",
        bodyItems: [groups],
      })
      expect(source).toEqual(original)
    }
  )

  it("preserves meaningful statuses, distinct dates, and invalid timestamps", () => {
    const source = event({
      sourceType: "mailerlite",
      type: "added",
      occurredAt: "2026-03-02T14:21:26Z",
      body: createQaTimelineEventBody([
        { question: "Status", answer: "unsubscribed" },
        { question: "Subscribed", answer: "2026-03-02T14:21:27Z" },
        { question: "Subscribed", answer: "2026-02-30T14:21:26Z" },
        { question: "Subscribed", answer: "invalid" },
      ]),
    })
    expect(createTimelineEventView(source).bodyItems).toEqual([
      { kind: "qa", question: "Status", answer: "unsubscribed" },
      { kind: "qa", question: "Subscribed", answer: "Mar 2, 2026, 14:21 UTC" },
      ...source.body.blocks.slice(2),
    ])
  })

  it.each([
    ["mailerlite", "payment"],
    ["forms", "added"],
  ] as const)("retains status and date details for %s %s", (sourceType, type) => {
    const view = createTimelineEventView(event({
      sourceType,
      type,
      body: createQaTimelineEventBody([
        { question: "Status", answer: "active" },
        { question: "Subscribed", answer: "2026-05-07T08:00:00Z" },
      ]),
    }))
    expect(view.bodyItems).toEqual([
      { kind: "qa", question: "Status", answer: "active" },
      { kind: "qa", question: "Subscribed", answer: "May 7, 2026, 08:00 UTC" },
    ])
  })

  it("does not restore removed fields through the empty-body summary", () => {
    const view = createTimelineEventView(event({
      sourceType: "mailerlite",
      type: "added",
      body: createQaTimelineEventBody([
        { question: "Status", answer: "active" },
        { question: "Subscribed", answer: "2026-05-07T08:00:00Z" },
      ]),
      display: { title: "Subscribed to MailerLite", summary: "Status: active" },
    }))
    expect(view.bodyItems).toEqual([])
    expect(view.summary).toBe("")
  })

  it.each(["invalid", "2026-02-30T08:00:00Z", ""])(
    "preserves invalid header dates and does not deduplicate against them: %s",
    (occurredAt) => {
      const view = createTimelineEventView(event({
        sourceType: "mailerlite",
        type: "added",
        occurredAt,
        body: createQaTimelineEventBody([
          { question: "Subscribed", answer: "2026-03-02T08:00:00Z" },
        ]),
      }))
      expect(view.date).toBe(occurredAt || "Unknown")
      expect(view.bodyItems).toHaveLength(1)
    }
  )

  it("uses persisted Timeline Event identity as the UI key", () => {
    expect(createTimelineEventView(event())).toMatchObject({ eventKey: "event_1", sourceId: "source_1" })
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
      { date: "May 7, 2026, 08:00 UTC" },
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


describe("timeline submission grouping", () => {
  it("groups only identified Google Form submissions, preserving order and input", () => {
    const views = createTimelineEventViews([
      event({ id: "new" }),
      event({ id: "payment", sourceType: "stripe", type: "payment" }),
      event({ id: "old" }),
      event({ id: "other-form", sourceId: "source_2" }),
      event({ id: "unknown-1", sourceId: null }),
      event({ id: "unknown-2", sourceId: null }),
      event({ id: "generic-form", sourceType: null }),
    ])
    const original = structuredClone(views)
    expect(groupTimelineEvents(views).map((group) => group.events.map((item) => item.eventKey)))
      .toEqual([["new", "old"], ["payment"], ["other-form"], ["unknown-1"], ["unknown-2"], ["generic-form"]])
    expect(views).toEqual(original)
    expect(groupTimelineEvents([])).toEqual([])
  })
})
