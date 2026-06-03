import { describe, expect, it } from "vitest"

import { createSupabaseClientNoteWriter } from "@/features/clients/adapters/supabase-note-writer"
import { createTextTimelineEventBody } from "@/features/clients/domain/timeline-event-body"

type Call = { table: string; op: string; values?: unknown; eq: [string, unknown][] }

function fakeClient(
  responses: {
    insert?: { data: unknown; error: { message: string } | null }
    mutate?: { error: { message: string } | null }
  } = {}
) {
  const calls: Call[] = []

  function mutateBuilder(call: Call) {
    const result = responses.mutate ?? { error: null }
    const builder = {
      eq(column: string, value: unknown) {
        call.eq.push([column, value])
        return builder
      },
      then(
        onFulfilled: (value: { error: { message: string } | null }) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) {
        return Promise.resolve(result).then(onFulfilled, onRejected)
      },
    }
    return builder
  }

  const client = {
    from(table: string) {
      return {
        insert(values: unknown) {
          const call: Call = { table, op: "insert", values, eq: [] }
          calls.push(call)
          return {
            select() {
              return {
                async single() {
                  return (
                    responses.insert ?? {
                      data: { id: "note_1", event_date: "2026-06-03T10:00:00.000Z" },
                      error: null,
                    }
                  )
                },
              }
            },
          }
        },
        update(values: unknown) {
          const call: Call = { table, op: "update", values, eq: [] }
          calls.push(call)
          return mutateBuilder(call)
        },
        delete() {
          const call: Call = { table, op: "delete", eq: [] }
          calls.push(call)
          return mutateBuilder(call)
        },
      }
    },
  }

  return { client, calls }
}

describe("supabase client note writer", () => {
  it("inserts a manual_note timeline event and returns its id + date", async () => {
    const { client, calls } = fakeClient()
    const writer = createSupabaseClientNoteWriter({ client })

    const created = await writer.create({
      workspaceId: "workspace_1",
      clientId: "client_1",
      body: createTextTimelineEventBody("Hello"),
    })

    expect(created).toEqual({ id: "note_1", occurredAt: "2026-06-03T10:00:00.000Z" })
    expect(calls[0]).toMatchObject({
      table: "timeline_events",
      op: "insert",
      values: {
        workspace_id: "workspace_1",
        client_id: "client_1",
        event_type: "manual_note",
        body: { text: "Hello", blocks: [{ kind: "text", text: "Hello" }] },
      },
    })
    expect(typeof (calls[0]!.values as { event_date: string }).event_date).toBe(
      "string"
    )
    // Client-level notes carry no parent link.
    expect(calls[0]!.values).not.toHaveProperty("parent_event_id")
  })

  it("forwards parent_event_id when the note is pinned to an event", async () => {
    const { client, calls } = fakeClient()
    const writer = createSupabaseClientNoteWriter({ client })

    await writer.create({
      workspaceId: "workspace_1",
      clientId: "client_1",
      body: createTextTimelineEventBody("Pinned"),
      parentEventId: "event_42",
    })

    expect(calls[0]!.values).toMatchObject({ parent_event_id: "event_42" })
  })

  it("scopes update by workspace, id, and manual_note type", async () => {
    const { client, calls } = fakeClient()
    const writer = createSupabaseClientNoteWriter({ client })

    await writer.update({
      workspaceId: "workspace_1",
      id: "note_1",
      body: createTextTimelineEventBody("Edited"),
    })

    expect(calls[0]).toMatchObject({ op: "update" })
    expect(calls[0]!.eq).toEqual([
      ["workspace_id", "workspace_1"],
      ["id", "note_1"],
      ["event_type", "manual_note"],
    ])
  })

  it("treats a null error as success without depending on returned rows", async () => {
    const { client, calls } = fakeClient({ mutate: { error: null } })
    const writer = createSupabaseClientNoteWriter({ client })

    await expect(
      writer.delete({ workspaceId: "workspace_1", id: "note_1" })
    ).resolves.toBeUndefined()
    expect(calls[0]!.eq).toEqual([
      ["workspace_id", "workspace_1"],
      ["id", "note_1"],
      ["event_type", "manual_note"],
    ])
  })

  it("throws note_action_failed when the mutation errors", async () => {
    const { client } = fakeClient({ mutate: { error: { message: "boom" } } })
    const writer = createSupabaseClientNoteWriter({ client })

    await expect(
      writer.delete({ workspaceId: "workspace_1", id: "note_1" })
    ).rejects.toThrow("note_action_failed")
  })

  it("throws note_action_failed when an insert errors", async () => {
    const { client } = fakeClient({
      insert: { data: null, error: { message: "boom" } },
    })
    const writer = createSupabaseClientNoteWriter({ client })

    await expect(
      writer.create({
        workspaceId: "workspace_1",
        clientId: "client_1",
        body: createTextTimelineEventBody("Hello"),
      })
    ).rejects.toThrow("note_action_failed")
  })
})
