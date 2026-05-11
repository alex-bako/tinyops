import { describe, expect, it } from "vitest"

import {
  createClientDetail,
} from "@/features/clients/application/client-memory"
import {
  mapClientRowToProfile,
  type ClientRow,
} from "@/features/clients/adapters/supabase-client-reader"

const baseRow: ClientRow = {
  id: "client_1",
  workspace_id: "workspace_1",
  primary_email: "anna@example.com",
  display_name: "Anna Smith",
  slug: "anna-smith",
  status: "active",
  tags: ["March cohort", "vip"],
  first_seen_at: "2026-02-10T00:00:00.000Z",
  last_seen_at: "2026-05-07T08:00:00.000Z",
  last_contacted_at: "2026-05-07T08:00:00.000Z",
  do_not_contact: false,
  unsubscribe_status: "subscribed",
  consent_status: "unknown",
  sensitivity_level: 0,
  created_at: "2026-02-10T00:00:00.000Z",
  updated_at: "2026-05-07T08:00:00.000Z",
  timeline_events: [
    {
      id: "event_older",
      workspace_id: "workspace_1",
      client_id: "client_1",
      source_id: "source_1",
      raw_record_id: "raw_1",
      event_type: "email_received",
      event_date: "2026-03-08T10:00:00.000Z",
      title: "Replay access",
      summary: "Asked for help opening replay library.",
      body_text: "Could you send the replay link again?",
      participants: [],
      metadata: {},
      sensitivity_level: 0,
      ai_extracted_fields: {},
      created_at: "2026-03-08T10:00:00.000Z",
      updated_at: "2026-03-08T10:00:00.000Z",
    },
    {
      id: "event_newer",
      workspace_id: "workspace_1",
      client_id: "client_1",
      source_id: "source_2",
      raw_record_id: "raw_2",
      event_type: "form_submission",
      event_date: "2026-05-07T08:00:00.000Z",
      title: "Monthly feedback",
      summary: "Shared progress update.",
      body_text: "Progress update",
      participants: [],
      metadata: {},
      sensitivity_level: 2,
      ai_extracted_fields: {},
      created_at: "2026-05-07T08:00:00.000Z",
      updated_at: "2026-05-07T08:00:00.000Z",
    },
  ],
}

describe("client mappers", () => {
  it("maps persisted client rows to existing client detail view data", () => {
    const profile = mapClientRowToProfile(baseRow)
    const detail = createClientDetail(profile)

    expect(profile).toMatchObject({
      id: "client_1",
      workspaceId: "workspace_1",
      primaryEmail: "anna@example.com",
      displayName: "Anna Smith",
      timeline: [
        expect.objectContaining({
          id: "event_older",
          occurredAt: "2026-03-08T10:00:00.000Z",
        }),
        expect.objectContaining({
          id: "event_newer",
          occurredAt: "2026-05-07T08:00:00.000Z",
        }),
      ],
    })
    expect(detail).toMatchObject({
      slug: "anna-smith",
      name: "Anna Smith",
      email: "anna@example.com",
      cohort: "March cohort",
      sources: 2,
      lastContact: "May 7",
      status: "active",
      flags: ["sensitive"],
    })
    expect(detail.timeline.map((event) => event.title)).toEqual([
      "Monthly feedback",
      "Replay access",
    ])
    expect(detail.timeline[0]).toMatchObject({
      id: "event_newer",
      type: "form",
      sensitivityLevel: 2,
      summary: "Shared progress update.",
      bodyText: "Progress update",
    })
  })

  it("uses primary email as the display name fallback", () => {
    const detail = createClientDetail(
      mapClientRowToProfile({
        ...baseRow,
        display_name: "",
        tags: [],
        timeline_events: [],
      })
    )

    expect(detail.name).toBe("anna@example.com")
    expect(detail.cohort).toBe("Imported")
    expect(detail.timeline).toEqual([])
  })

  it("maps imported IMAP owner replies as sent timeline events", () => {
    const detail = createClientDetail(
      mapClientRowToProfile({
        ...baseRow,
        timeline_events: [
          {
            ...baseRow.timeline_events![0]!,
            id: "event_sent",
            event_type: "email_sent",
            title: "Re: replay library access",
          },
        ],
      })
    )

    expect(detail.timeline[0]).toMatchObject({
      type: "sent",
      title: "Re: replay library access",
    })
  })
})
