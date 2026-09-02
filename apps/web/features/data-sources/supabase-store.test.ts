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
    order(column: string, options?: { referencedTable?: string }) {
      calls.push({ table, method: "order", column, options })
      if (options?.referencedTable) return api
      return Promise.resolve(result)
    },
    limit(count: number, options?: unknown) {
      calls.push({ table, method: "limit", count, options })
      return api
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
  slug: "primary-inbox",
  display_name: "IMAP mailbox",
  status: "connected",
  config_version: 1,
  config: {
    host: "imap.example.com",
    port: 993,
    encryption: "ssl",
    username: "hello@example.com",
  },
  created_at: "2026-05-09T00:00:00.000Z",
  updated_at: "2026-05-09T00:00:00.000Z",
  data_source_intake_configs: {
    history_window: "12mo",
    watched_folders: ["INBOX"],
    skip_senders: [],
    message_filters: { mode: "and", rules: [] },
    available_folders: [{ path: "INBOX", messages: 1204 }],
  },
  data_source_secrets: [
    {
      purpose: "imap_password",
      masked_value: "••••cret",
      replaced_at: null,
    },
  ],
  data_source_sync_states: {
    status: "queued",
    cursor: null,
    last_error: null,
    last_synced_at: null,
  },
}

const googleFormsSourceRow = {
  id: "forms_source_1",
  workspace_id: "workspace_1",
  source_type: "forms",
  slug: "practice-intake",
  display_name: "Practice intake",
  status: "connected",
  config_version: 1,
  config: {
    externalFormId: "1AbC_Def-1234567890",
    connectionMode: "manual_csv",
    mapping: {
      identityColumn: "Email Address",
      timestampColumn: "Timestamp",
    },
    latestUpload: {
      id: "upload_1",
      fileName: "practice-intake.csv",
      rowCount: 1,
      uploadedAt: "2026-05-10T00:00:00.000Z",
    },
  },
  created_at: "2026-05-10T00:00:00.000Z",
  updated_at: "2026-05-10T00:00:00.000Z",
  data_source_sync_states: {
    status: "queued",
    cursor: null,
    last_error: null,
    last_synced_at: null,
  },
}

describe("supabase data source store", () => {
  it("lists workspace data sources and maps split IMAP connection and intake rows", async () => {
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
        connection: { host: "imap.example.com" },
        intake: {
          watchedFolders: ["INBOX"],
        },
        folderSnapshot: {
          availableFolders: [{ path: "INBOX", messages: 1204 }],
        },
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
    expect(calls).toContainEqual({
      table: "data_sources",
      method: "order",
      column: "started_at",
      options: {
        referencedTable: "data_source_sync_runs",
        ascending: false,
      },
    })
    expect(calls).toContainEqual({
      table: "data_sources",
      method: "limit",
      count: 5,
      options: { referencedTable: "data_source_sync_runs" },
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
        displayName: "Primary inbox",
        password: "top-secret",
        connection: {
          host: "imap.example.com",
          port: 993,
          encryption: "ssl",
          username: "hello@example.com",
        },
        intake: {
          historyWindow: "12mo",
          watchedFolders: ["INBOX"],
          skipSenders: [],
          messageFilters: { mode: "and", rules: [] },
        },
        folderSnapshot: {
          availableFolders: [{ path: "INBOX", messages: 1204 }],
        },
      })
    ).resolves.toMatchObject({ id: "source_1", status: "connected" })

    expect(calls[0]).toEqual({
      method: "rpc",
      fn: "connect_imap_data_source",
      args: {
        imap_available_folders: [{ path: "INBOX", messages: 1204 }],
        imap_display_name: "Primary inbox",
        imap_encryption: "ssl",
        imap_history_window: "12mo",
        imap_host: "imap.example.com",
        imap_message_filters: { mode: "and", rules: [] },
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

  it("finds one workspace data source by type and stable slug", async () => {
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
      store.findBySlugForWorkspace({
        workspaceId: "workspace_1",
        sourceType: "imap",
        sourceSlug: "primary-inbox",
      })
    ).resolves.toMatchObject({
      id: "source_1",
      type: "imap",
      sourceSlug: "primary-inbox",
    })
    expect(calls).toContainEqual({
      table: "data_sources",
      method: "eq",
      column: "source_type",
      value: "imap",
    })
    expect(calls).toContainEqual({
      table: "data_sources",
      method: "eq",
      column: "slug",
      value: "primary-inbox",
    })
  })

  it("updates connection settings and optional password without sending intake fields", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        return queryChain(table, calls, { data: sourceRow, error: null })
      },
      rpc(fn: string, args: unknown) {
        calls.push({ method: "rpc", fn, args })
        return Promise.resolve({ data: null, error: null })
      },
    }

    const store = createSupabaseDataSourceStore({ client: client as never })

    await expect(
      store.updateImapConnection({
        workspaceId: "workspace_1",
        sourceId: "source_1",
        displayName: "Primary inbox",
        connection: {
          host: "imap.new.com",
          port: 993,
          encryption: "starttls",
          username: "owner@example.com",
        },
        password: "new-secret",
        folderSnapshot: {
          availableFolders: [{ path: "Receipts", messages: 9 }],
        },
      })
    ).resolves.toMatchObject({ id: "source_1" })

    expect(calls[0]).toEqual({
      method: "rpc",
      fn: "update_imap_connection_settings",
      args: {
        imap_available_folders: [{ path: "Receipts", messages: 9 }],
        imap_display_name: "Primary inbox",
        imap_encryption: "starttls",
        imap_host: "imap.new.com",
        imap_password: "new-secret",
        imap_port: 993,
        imap_username: "owner@example.com",
        target_source_id: "source_1",
        target_workspace_id: "workspace_1",
      },
    })
  })

  it("updates intake settings without sending connection fields", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        return queryChain(table, calls, { data: sourceRow, error: null })
      },
      rpc(fn: string, args: unknown) {
        calls.push({ method: "rpc", fn, args })
        return Promise.resolve({ data: null, error: null })
      },
    }

    const store = createSupabaseDataSourceStore({ client: client as never })

    await expect(
      store.updateImapIntake({
        workspaceId: "workspace_1",
        sourceId: "source_1",
        intake: {
          historyWindow: "all",
          watchedFolders: ["Receipts"],
          skipSenders: ["notifications@example.com"],
          messageFilters: {
            mode: "and",
            rules: [
              {
                id: "rule_1",
                field: "subject",
                operator: "does_not_contain",
                value: "invoice",
              },
            ],
          },
        },
      })
    ).resolves.toMatchObject({ id: "source_1" })

    expect(calls[0]).toEqual({
      method: "rpc",
      fn: "update_imap_intake_config",
      args: {
        imap_history_window: "all",
        imap_message_filters: {
          mode: "and",
          rules: [
            {
              id: "rule_1",
              field: "subject",
              operator: "does_not_contain",
              value: "invoice",
            },
          ],
        },
        imap_skip_senders: ["notifications@example.com"],
        imap_watched_folders: ["Receipts"],
        target_source_id: "source_1",
        target_workspace_id: "workspace_1",
      },
    })
  })

  it("persists refreshed IMAP folder snapshots", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        return queryChain(table, calls, { data: sourceRow, error: null })
      },
      rpc(fn: string, args: unknown) {
        calls.push({ method: "rpc", fn, args })
        return Promise.resolve({ data: null, error: null })
      },
    }

    const store = createSupabaseDataSourceStore({ client: client as never })

    await expect(
      store.updateImapFolderSnapshot({
        workspaceId: "workspace_1",
        sourceId: "source_1",
        folderSnapshot: {
          availableFolders: [{ path: "INBOX", messages: 2000 }],
        },
      })
    ).resolves.toMatchObject({ id: "source_1" })

    expect(calls[0]).toEqual({
      method: "rpc",
      fn: "update_imap_folder_snapshot",
      args: {
        imap_available_folders: [{ path: "INBOX", messages: 2000 }],
        target_source_id: "source_1",
        target_workspace_id: "workspace_1",
      },
    })
  })

  it("connects Google Forms manual CSV through the upload RPC then reloads the source", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        return queryChain(table, calls, {
          data: googleFormsSourceRow,
          error: null,
        })
      },
      rpc(fn: string, args: unknown) {
        calls.push({ method: "rpc", fn, args })
        return Promise.resolve({ data: "forms_source_1", error: null })
      },
    }

    const store = createSupabaseDataSourceStore({ client: client as never })

    await expect(
      store.connectGoogleFormsManualCsv({
        workspaceId: "workspace_1",
        source: {
          externalFormId: "1AbC_Def-1234567890",
          connectionMode: "manual_csv",
          displayName: "Practice intake",
          mapping: {
            identityColumn: "Email Address",
            timestampColumn: "Timestamp",
          },
        },
        upload: {
          fileName: "practice-intake.csv",
          rows: [
            {
              rowNumber: 2,
              payload: {
                Timestamp: "2026-05-10T09:15:00.000Z",
                "Email Address": "anna@example.com",
                "Full name": "Anna Smith",
              },
            },
          ],
        },
      })
    ).resolves.toMatchObject({
      id: "forms_source_1",
      type: "forms",
      externalFormId: "1AbC_Def-1234567890",
    })

    expect(calls[0]).toEqual({
      method: "rpc",
      fn: "connect_google_forms_manual_csv_data_source",
      args: {
        form_connection_mode: "manual_csv",
        form_display_name: "Practice intake",
        form_external_id: "1AbC_Def-1234567890",
        form_mapping: {
          identityColumn: "Email Address",
          timestampColumn: "Timestamp",
        },
        upload_file_name: "practice-intake.csv",
        upload_rows: [
          {
            rowNumber: 2,
            payload: {
              Timestamp: "2026-05-10T09:15:00.000Z",
              "Email Address": "anna@example.com",
              "Full name": "Anna Smith",
            },
          },
        ],
        target_workspace_id: "workspace_1",
      },
    })
  })

  it("requests sync for every configured source through one bulk RPC", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        return queryChain(table, calls, { data: sourceRow, error: null })
      },
      rpc(fn: string, args: unknown) {
        calls.push({ method: "rpc", fn, args })
        return Promise.resolve({ data: 2, error: null })
      },
    }

    const store = createSupabaseDataSourceStore({ client: client as never })

    await expect(
      store.requestAllSyncs({ workspaceId: "workspace_1" })
    ).resolves.toEqual({ queued: 2 })

    expect(calls).toEqual([
      {
        method: "rpc",
        fn: "request_all_data_source_syncs",
        args: {
          target_workspace_id: "workspace_1",
        },
      },
    ])
  })

  it("connects Google Forms live sources through the api RPC then reloads the source", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        return queryChain(table, calls, {
          data: googleFormsSourceRow,
          error: null,
        })
      },
      rpc(fn: string, args: unknown) {
        calls.push({ method: "rpc", fn, args })
        return Promise.resolve({ data: "forms_source_1", error: null })
      },
    }

    const store = createSupabaseDataSourceStore({ client: client as never })

    await expect(
      store.connectGoogleFormsApi({
        workspaceId: "workspace_1",
        source: {
          externalFormId: "1AbC_Def-1234567890",
          connectionMode: "api",
          displayName: "Practice intake live",
          identityQuestionId: "q_email",
        },
      })
    ).resolves.toMatchObject({ id: "forms_source_1", type: "forms" })

    expect(calls[0]).toEqual({
      method: "rpc",
      fn: "connect_google_forms_api_data_source",
      args: {
        target_workspace_id: "workspace_1",
        form_external_id: "1AbC_Def-1234567890",
        form_display_name: "Practice intake live",
        form_identity_question_id: "q_email",
      },
    })
  })
})
