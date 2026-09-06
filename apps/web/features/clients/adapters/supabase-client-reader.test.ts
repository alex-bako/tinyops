import { describe, expect, it } from "vitest"

import { createSupabaseClientReader } from "@/features/clients/adapters/supabase-client-reader"

const clientRow = {
  id: "client_1",
  workspace_id: "workspace_1",
  primary_email: "anna@example.com",
  display_name: "Anna Smith",
  slug: "anna-smith",
  status: "active",
  tags: ["March cohort"],
  first_seen_at: "2026-02-10T00:00:00.000Z",
  last_seen_at: "2026-05-07T08:00:00.000Z",
  last_contacted_at: "2026-05-07T08:00:00.000Z",
  do_not_contact: false,
  unsubscribe_status: "subscribed",
  consent_status: "unknown",
  sensitivity_level: 0,
  created_at: "2026-02-10T00:00:00.000Z",
  updated_at: "2026-05-07T08:00:00.000Z",
  client_attributes: [
    { id: "attr_1", attribute_key: "Goal", attribute_value: "First", source_id: "source_1" },
    { id: "attr_2", attribute_key: "Goal", attribute_value: "Second", source_id: "source_1" },
  ],
  timeline_events: [
    {
      id: "event_newer",
      workspace_id: "workspace_1",
      client_id: "client_1",
      source_id: "source_1",
      source: { display_name: "Practice intake", source_type: "forms" },
      raw_record_id: "raw_1",
      event_type: "form_submission",
      event_date: "2026-05-07T08:00:00.000Z",
      body: {
        text: "Progress update",
        blocks: [{ kind: "text", text: "Progress update" }],
      },
      participants: [],
      metadata: {},
      sensitivity_level: 2,
      ai_extracted_fields: {},
      created_at: "2026-05-07T08:00:00.000Z",
      updated_at: "2026-05-07T08:00:00.000Z",
    },
  ],
}

function queryChain(table: string, calls: unknown[]) {
  const api = {
    select(columns: string) {
      calls.push({ table, method: "select", columns })
      return api
    },
    eq(column: string, value: unknown) {
      calls.push({ table, method: "eq", column, value })
      return api
    },
    order(column: string, options?: unknown) {
      calls.push({ table, method: "order", column, options })
      return api
    },
    limit(count: number) {
      calls.push({ table, method: "limit", count })
      return Promise.resolve({ data: [clientRow], error: null })
    },
    maybeSingle() {
      calls.push({ table, method: "maybeSingle" })
      return Promise.resolve({ data: clientRow, error: null })
    },
  }
  return api
}

describe("supabase client reader adapter", () => {
  it("maps persisted Timeline Event identity and raw body into domain profile", async () => {
    const calls: unknown[] = []
    const reader = createSupabaseClientReader({
      client: {
        from(table: string) {
          return queryChain(table, calls)
        },
      } as never,
    })

    await expect(
      reader.findClientBySlug({ workspaceId: "workspace_1", slug: "anna-smith" })
    ).resolves.toMatchObject({
      id: "client_1",
      attributes: [
        { id: "attr_1", key: "Goal", value: "First" },
        { id: "attr_2", key: "Goal", value: "Second" },
      ],
      timeline: [
        {
          id: "event_newer",
          occurredAt: "2026-05-07T08:00:00.000Z",
          sourceType: "forms",
          type: "form",
          body: {
            text: "Progress update",
            blocks: [{ kind: "text", text: "Progress update" }],
          },
          display: {
            title: "Practice intake",
            summary: "Progress update",
          },
          sensitivityLevel: 2,
        },
      ],
    })
    expect(calls[0]).toMatchObject({ method: "select", columns: expect.stringMatching(/client_attributes\s*\(\s*id,/) })
    expect(JSON.stringify(calls[0])).toContain("timeline_events")
    expect(JSON.stringify(calls[0])).toContain("body")
    expect(JSON.stringify(calls[0])).toContain("source:data_sources")
    expect(JSON.stringify(calls[0])).toContain("source_type")
  })
})
