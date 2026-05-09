import { describe, expect, it } from "vitest"

import { createSupabaseDataSourceStore } from "@/features/data-sources/supabase-store"

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
    is(column: string, value: unknown) {
      calls.push({ table, method: "is", column, value })
      return api
    },
    order(column: string, options?: unknown) {
      calls.push({ table, method: "order", column, options })
      return Promise.resolve(result)
    },
    maybeSingle() {
      calls.push({ table, method: "maybeSingle" })
      return Promise.resolve(result)
    },
  }
  return api
}

const sourceRow = {
  id: "source_1",
  workspace_id: "workspace_1",
  source_type: "imap",
  display_name: "IMAP mailbox",
  status: "connected",
  config_version: 1,
  config: {
    host: "imap.example.com",
    port: 993,
    encryption: "ssl",
    username: "hello@example.com",
    historyWindow: "12mo",
    watchedFolders: ["INBOX"],
    skipSenders: [],
  },
  created_at: "2026-05-09T00:00:00.000Z",
  updated_at: "2026-05-09T00:00:00.000Z",
  data_source_secrets: [
    {
      purpose: "imap_password",
      masked_value: "••••cret",
      replaced_at: null,
    },
  ],
  data_source_sync_states: {
    status: "queued",
    history_window: "12mo",
    cursor: null,
    last_error: null,
    last_synced_at: null,
  },
}

describe("supabase data source store", () => {
  it("lists workspace data sources and maps IMAP rows", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        return queryChain(table, calls, { data: [sourceRow], error: null })
      },
      rpc() {
        throw new Error("unexpected rpc call")
      },
    }

    const store = createSupabaseDataSourceStore({ client: client as never })

    await expect(store.listForWorkspace("workspace_1")).resolves.toMatchObject([
      {
        id: "source_1",
        workspaceId: "workspace_1",
        type: "imap",
        config: { host: "imap.example.com", watchedFolders: ["INBOX"] },
        secret: { purpose: "imap_password", maskedValue: "••••cret" },
        sync: { status: "queued" },
      },
    ])
    expect(calls).toContainEqual({
      table: "data_sources",
      method: "eq",
      column: "workspace_id",
      value: "workspace_1",
    })
    expect(calls).toContainEqual({
      table: "data_sources",
      method: "is",
      column: "disconnected_at",
      value: null,
    })
  })

  it("connects IMAP through the credential-storing RPC then reloads the source", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        return queryChain(table, calls, { data: sourceRow, error: null })
      },
      rpc(fn: string, args: unknown) {
        calls.push({ method: "rpc", fn, args })
        return Promise.resolve({ data: "source_1", error: null })
      },
    }

    const store = createSupabaseDataSourceStore({ client: client as never })

    await expect(
      store.connectImap({
        workspaceId: "workspace_1",
        password: "top-secret",
        config: {
          host: "imap.example.com",
          port: 993,
          encryption: "ssl",
          username: "hello@example.com",
          historyWindow: "12mo",
          watchedFolders: ["INBOX"],
          skipSenders: [],
        },
      })
    ).resolves.toMatchObject({ id: "source_1", status: "connected" })

    expect(calls[0]).toEqual({
      method: "rpc",
      fn: "connect_imap_data_source",
      args: {
        imap_encryption: "ssl",
        imap_history_window: "12mo",
        imap_host: "imap.example.com",
        imap_password: "top-secret",
        imap_port: 993,
        imap_skip_senders: [],
        imap_username: "hello@example.com",
        imap_watched_folders: ["INBOX"],
        target_workspace_id: "workspace_1",
      },
    })
    expect(calls).toContainEqual({
      table: "data_sources",
      method: "eq",
      column: "id",
      value: "source_1",
    })
  })

  it("loads a data source by workspace and source row id", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        return queryChain(table, calls, { data: sourceRow, error: null })
      },
      rpc() {
        throw new Error("unexpected rpc call")
      },
    }

    const store = createSupabaseDataSourceStore({ client: client as never })

    await expect(
      store.findByIdForWorkspace({
        workspaceId: "workspace_1",
        sourceId: "source_1",
      })
    ).resolves.toMatchObject({ id: "source_1", type: "imap" })
    expect(calls).toContainEqual({
      table: "data_sources",
      method: "eq",
      column: "id",
      value: "source_1",
    })
    expect(calls).toContainEqual({
      table: "data_sources",
      method: "eq",
      column: "workspace_id",
      value: "workspace_1",
    })
  })
})
