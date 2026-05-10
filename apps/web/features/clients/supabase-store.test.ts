import { describe, expect, it } from "vitest"

import { createSupabaseClientStore } from "@/features/clients/supabase-store"

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
  timeline_events: [],
}

function queryChain(
  table: string,
  calls: unknown[],
  result:
    | { data: unknown; error: null }
    | { data: null; error: { message: string } }
) {
  const api = {
    select(columns: string) {
      calls.push({ table, method: "select", columns })
      return api
    },
    eq(column: string, value: unknown) {
      calls.push({ table, method: "eq", column, value })
      return api
    },
    or(filter: string) {
      calls.push({ table, method: "or", filter })
      return api
    },
    ilike(column: string, pattern: string) {
      calls.push({ table, method: "ilike", column, pattern })
      return api
    },
    order(column: string, options?: unknown) {
      calls.push({ table, method: "order", column, options })
      return api
    },
    limit(count: number) {
      calls.push({ table, method: "limit", count })
      return Promise.resolve(result)
    },
    maybeSingle() {
      calls.push({ table, method: "maybeSingle" })
      return Promise.resolve(result)
    },
  }
  return api
}

describe("supabase client store", () => {
  it("lists workspace clients as domain client profiles", async () => {
    const calls: unknown[] = []
    const store = createSupabaseClientStore({
      client: {
        from(table: string) {
          return queryChain(table, calls, { data: [clientRow], error: null })
        },
      } as never,
    })

    await expect(store.listClients("workspace_1")).resolves.toMatchObject([
      {
        slug: "anna-smith",
        primaryEmail: "anna@example.com",
        displayName: "Anna Smith",
        lastSeenAt: "2026-05-07T08:00:00.000Z",
      },
    ])
    expect(calls).toContainEqual({
      table: "clients",
      method: "eq",
      column: "workspace_id",
      value: "workspace_1",
    })
    expect(calls).toContainEqual({
      table: "clients",
      method: "order",
      column: "last_seen_at",
      options: { ascending: false, nullsFirst: false },
    })
  })

  it("searches profile fields with partial case-insensitive matching without raw or filters", async () => {
    const calls: unknown[] = []
    const results = [
      { data: [clientRow], error: null },
      { data: [clientRow], error: null },
    ]
    const store = createSupabaseClientStore({
      client: {
        from(table: string) {
          return queryChain(table, calls, results.shift()!)
        },
      } as never,
    })

    await expect(
      store.searchClients({
        workspaceId: "workspace_1",
        query: "anna",
        limit: 8,
      })
    ).resolves.toEqual([
      expect.objectContaining({
        slug: "anna-smith",
        email: "anna@example.com",
      }),
    ])
    expect(calls).toContainEqual({
      table: "clients",
      method: "ilike",
      column: "primary_email",
      pattern: "%anna%",
    })
    expect(calls).toContainEqual({
      table: "clients",
      method: "ilike",
      column: "display_name",
      pattern: "%anna%",
    })
    expect(calls).not.toContainEqual(expect.objectContaining({ method: "or" }))
    expect(calls).toContainEqual({ table: "clients", method: "limit", count: 8 })
  })

  it("escapes user search wildcards and PostgREST filter punctuation", async () => {
    const calls: unknown[] = []
    const results = [
      { data: [], error: null },
      { data: [], error: null },
    ]
    const store = createSupabaseClientStore({
      client: {
        from(table: string) {
          return queryChain(table, calls, results.shift()!)
        },
      } as never,
    })

    await expect(
      store.searchClients({
        workspaceId: "workspace_1",
        query: "ann%(test),_",
        limit: 8,
      })
    ).resolves.toEqual([])

    expect(calls).toContainEqual({
      table: "clients",
      method: "ilike",
      column: "primary_email",
      pattern: "%ann\\%\\(test\\)\\,\\_%",
    })
    expect(calls).not.toContainEqual(expect.objectContaining({ method: "or" }))
  })
})
