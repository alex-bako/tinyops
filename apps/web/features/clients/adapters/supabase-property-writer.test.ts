import { describe, expect, it } from "vitest"

import { createSupabaseClientPropertyWriter } from "@/features/clients/adapters/supabase-property-writer"

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
                  return responses.insert ?? { data: { id: "prop_1" }, error: null }
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

describe("supabase client property writer", () => {
  it("inserts a property with a serialized value and a numeric position", async () => {
    const { client, calls } = fakeClient()
    const writer = createSupabaseClientPropertyWriter({ client })

    const created = await writer.create({
      workspaceId: "workspace_1",
      clientId: "client_1",
      name: "Status",
      icon: "circle-dot",
      type: "status",
      value: { kind: "status", statusKind: "active", label: "Active" },
    })

    expect(created).toEqual({ id: "prop_1" })
    expect(calls[0]).toMatchObject({
      table: "client_properties",
      op: "insert",
      values: {
        workspace_id: "workspace_1",
        client_id: "client_1",
        name: "Status",
        icon: "circle-dot",
        type: "status",
        value: { statusKind: "active", label: "Active" },
      },
    })
    expect(typeof (calls[0]!.values as { position: number }).position).toBe("number")
  })

  it("scopes update by workspace and id and serializes the value", async () => {
    const { client, calls } = fakeClient()
    const writer = createSupabaseClientPropertyWriter({ client })

    await writer.update({
      workspaceId: "workspace_1",
      id: "prop_1",
      name: "Cohort",
      icon: "hash",
      type: "tags",
      value: { kind: "tags", values: ["March"] },
    })

    expect(calls[0]).toMatchObject({
      op: "update",
      values: { name: "Cohort", icon: "hash", type: "tags", value: { values: ["March"] } },
    })
    expect(calls[0]!.eq).toEqual([
      ["workspace_id", "workspace_1"],
      ["id", "prop_1"],
    ])
  })

  it("scopes delete by workspace and id", async () => {
    const { client, calls } = fakeClient()
    const writer = createSupabaseClientPropertyWriter({ client })

    await writer.delete({ workspaceId: "workspace_1", id: "prop_1" })

    expect(calls[0]).toMatchObject({ op: "delete" })
    expect(calls[0]!.eq).toEqual([
      ["workspace_id", "workspace_1"],
      ["id", "prop_1"],
    ])
  })

  it("writes a position per id, scoped by workspace + client + id, on reorder", async () => {
    const { client, calls } = fakeClient()
    const writer = createSupabaseClientPropertyWriter({ client })

    await writer.reorder({
      workspaceId: "workspace_1",
      clientId: "client_1",
      orderedIds: ["prop_b", "prop_a"],
    })

    expect(calls).toHaveLength(2)
    expect(calls[0]).toMatchObject({ op: "update", values: { position: 0 } })
    expect(calls[0]!.eq).toEqual([
      ["workspace_id", "workspace_1"],
      ["client_id", "client_1"],
      ["id", "prop_b"],
    ])
    expect(calls[1]).toMatchObject({ op: "update", values: { position: 1 } })
    expect(calls[1]!.eq).toContainEqual(["id", "prop_a"])
  })

  it("throws property_action_failed when a mutation errors", async () => {
    const { client } = fakeClient({ mutate: { error: { message: "boom" } } })
    const writer = createSupabaseClientPropertyWriter({ client })

    await expect(
      writer.delete({ workspaceId: "workspace_1", id: "prop_1" })
    ).rejects.toThrow("property_action_failed")
  })

  it("throws property_action_failed when the insert errors", async () => {
    const { client } = fakeClient({ insert: { data: null, error: { message: "boom" } } })
    const writer = createSupabaseClientPropertyWriter({ client })

    await expect(
      writer.create({
        workspaceId: "workspace_1",
        clientId: "client_1",
        name: "Status",
        icon: "circle-dot",
        type: "text",
        value: { kind: "text", text: "x" },
      })
    ).rejects.toThrow("property_action_failed")
  })
})
