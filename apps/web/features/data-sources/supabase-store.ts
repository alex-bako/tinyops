import type { SupabaseClient } from "@supabase/supabase-js"

import {
  mapDataSourceRow,
  type DataSourceRow,
} from "@/features/data-sources/mappers"
import type {
  DataSourceStore,
  ImapDataSource,
} from "@/features/data-sources/types"
import type { Database } from "@/lib/database.types"

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>
type SupabaseDataSourceClient = Pick<SupabaseClient<Database>, "from" | "rpc">

type DataSourceQuery = {
  eq(column: string, value: unknown): DataSourceQuery
  is(column: string, value: unknown): DataSourceQuery
  order(column: string, options?: unknown): QueryResult<DataSourceRow[]>
  maybeSingle(): QueryResult<DataSourceRow>
}

const DATA_SOURCE_COLUMNS = `
  id,
  workspace_id,
  source_type,
  display_name,
  status,
  config_version,
  config,
  created_at,
  updated_at,
  data_source_intake_configs (
    history_window,
    watched_folders,
    skip_senders,
    message_filters,
    available_folders
  ),
  data_source_secrets (
    purpose,
    masked_value,
    replaced_at
  ),
  data_source_sync_states (
    status,
    history_window,
    cursor,
    last_error,
    last_synced_at
  )
`

export function createSupabaseDataSourceStore({
  client,
}: {
  client: SupabaseDataSourceClient
}): DataSourceStore {
  async function findForWorkspace(input: {
    workspaceId: string
    sourceType: "imap"
  }) {
    const { data, error } = await baseDataSourceQuery(client)
      .eq("workspace_id", input.workspaceId)
      .eq("source_type", input.sourceType)
      .is("disconnected_at", null)
      .maybeSingle()

    if (error) throw new Error("Could not load data source", { cause: error })
    return data ? mapDataSourceRow(data as DataSourceRow) : null
  }

  async function findByIdForWorkspace(input: {
    workspaceId: string
    sourceId: string
  }) {
    const { data, error } = await baseDataSourceQuery(client)
      .eq("id", input.sourceId)
      .eq("workspace_id", input.workspaceId)
      .is("disconnected_at", null)
      .maybeSingle()

    if (error) throw new Error("Could not load data source", { cause: error })
    return data ? mapDataSourceRow(data as DataSourceRow) : null
  }

  async function requireImapById(input: {
    workspaceId: string
    sourceId: string
  }): Promise<ImapDataSource> {
    const source = await findByIdForWorkspace(input)
    if (!source || source.type !== "imap") {
      throw new Error("source_not_found")
    }
    return source
  }

  return {
    async listForWorkspace(workspaceId) {
      const { data, error } = await baseDataSourceQuery(client)
        .eq("workspace_id", workspaceId)
        .is("disconnected_at", null)
        .order("source_type", { ascending: true })

      if (error) throw new Error("Could not load data sources", { cause: error })

      return ((data ?? []) as DataSourceRow[]).map(mapDataSourceRow)
    },

    findForWorkspace,

    findByIdForWorkspace,

    async connectImap(input) {
      const { data, error } = await client.rpc("connect_imap_data_source", {
        target_workspace_id: input.workspaceId,
        imap_host: input.connection.host,
        imap_port: input.connection.port,
        imap_encryption: input.connection.encryption,
        imap_username: input.connection.username,
        imap_password: input.password,
        imap_history_window: input.intake.historyWindow,
        imap_watched_folders: input.intake.watchedFolders,
        imap_skip_senders: input.intake.skipSenders,
        imap_message_filters: input.intake.messageFilters,
        imap_available_folders: input.folderSnapshot.availableFolders,
      })

      if (error) throwDataSourceStoreError(error, "Could not connect IMAP")

      return requireImapById({
        workspaceId: input.workspaceId,
        sourceId: String(data),
      })
    },

    async updateImapConnection(input) {
      const { error } = await client.rpc("update_imap_connection_settings", {
        target_source_id: input.sourceId,
        target_workspace_id: input.workspaceId,
        imap_host: input.connection.host,
        imap_port: input.connection.port,
        imap_encryption: input.connection.encryption,
        imap_username: input.connection.username,
        imap_password: input.password ?? "",
        imap_available_folders: input.folderSnapshot.availableFolders,
      })

      if (error) {
        throwDataSourceStoreError(error, "Could not update IMAP connection")
      }

      return requireImapById({
        workspaceId: input.workspaceId,
        sourceId: input.sourceId,
      })
    },

    async updateImapIntake(input) {
      const { error } = await client.rpc("update_imap_intake_config", {
        target_source_id: input.sourceId,
        target_workspace_id: input.workspaceId,
        imap_history_window: input.intake.historyWindow,
        imap_watched_folders: input.intake.watchedFolders,
        imap_skip_senders: input.intake.skipSenders,
        imap_message_filters: input.intake.messageFilters,
      })

      if (error) {
        throwDataSourceStoreError(error, "Could not update IMAP intake")
      }

      return requireImapById({
        workspaceId: input.workspaceId,
        sourceId: input.sourceId,
      })
    },

    async updateImapFolderSnapshot(input) {
      const { error } = await client.rpc("update_imap_folder_snapshot", {
        target_source_id: input.sourceId,
        target_workspace_id: input.workspaceId,
        imap_available_folders: input.folderSnapshot.availableFolders,
      })

      if (error) {
        throwDataSourceStoreError(error, "Could not update IMAP folders")
      }

      return requireImapById({
        workspaceId: input.workspaceId,
        sourceId: input.sourceId,
      })
    },

    async disconnect(input) {
      const { error } = await client.rpc("disconnect_data_source", {
        target_source_id: input.sourceId,
        target_workspace_id: input.workspaceId,
      })

      if (error) {
        throwDataSourceStoreError(error, "Could not disconnect data source")
      }
    },

    async requestSync(input) {
      const { error } = await client.rpc("request_data_source_sync", {
        target_source_id: input.sourceId,
        target_workspace_id: input.workspaceId,
      })

      if (error) {
        throwDataSourceStoreError(error, "Could not request data source sync")
      }
    },
  }
}

function baseDataSourceQuery(client: SupabaseDataSourceClient): DataSourceQuery {
  return client
    .from("data_sources")
    .select(DATA_SOURCE_COLUMNS) as unknown as DataSourceQuery
}

function throwDataSourceStoreError(error: unknown, fallback: string): never {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : null

  if (message && DATA_SOURCE_STORE_ERRORS.has(message)) {
    throw new Error(message, { cause: error })
  }

  throw new Error(fallback, { cause: error })
}

const DATA_SOURCE_STORE_ERRORS = new Set([
  "invalid_imap_config",
  "source_not_found",
  "source_manage_forbidden",
])
