import type { SupabaseClient } from "@supabase/supabase-js"

import {
  mapDataSourceRow,
  type DataSourceRow,
} from "@/features/data-sources/mappers"
import type {
  DataSourceStore,
  GoogleFormsDataSource,
  StripeDataSource,
  ImapDataSource,
  MailerLiteDataSource,
} from "@/features/data-sources/types"
import type { Database } from "@/lib/database.types"

type QueryResult<T> = Promise<{
  data: T | null
  error: { message: string } | null
}>
type SupabaseRpcResult = PromiseLike<{
  data: unknown
  error: { message: string } | null
}>
type SupabaseDataSourceClient = Pick<SupabaseClient<Database>, "from"> & {
  rpc(fn: string, args: unknown): SupabaseRpcResult
}

type DataSourceQuery = {
  eq(column: string, value: unknown): DataSourceQuery
  is(column: string, value: unknown): DataSourceQuery
  order(
    column: string,
    options: {
      referencedTable: string
      ascending?: boolean
      nullsFirst?: boolean
    }
  ): DataSourceQuery
  order(column: string, options?: unknown): QueryResult<DataSourceRow[]>
  limit(count: number, options: { referencedTable: string }): DataSourceQuery
  maybeSingle(): QueryResult<DataSourceRow>
}

const DATA_SOURCE_COLUMNS = `
  id,
  workspace_id,
  source_type,
  slug,
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
    cursor,
    last_error,
    last_synced_at
  ),
  data_source_sync_runs (
    trigger,
    status,
    started_at,
    finished_at,
    error_code,
    error_message,
    cause_message,
    persisted_counts,
    diagnostics
  )
`

export function createSupabaseDataSourceStore({
  client,
}: {
  client: SupabaseDataSourceClient
}): DataSourceStore {
  async function findByIdForWorkspace(input: {
    workspaceId: string
    sourceId: string
  }) {
    const { data, error } = await withRecentSyncRuns(
      baseDataSourceQuery(client)
    )
      .eq("id", input.sourceId)
      .eq("workspace_id", input.workspaceId)
      .is("disconnected_at", null)
      .maybeSingle()

    if (error) throw new Error("Could not load data source", { cause: error })
    return data ? mapDataSourceRow(data as DataSourceRow) : null
  }

  async function findBySlugForWorkspace(input: {
    workspaceId: string
    sourceType: string
    sourceSlug: string
  }) {
    const { data, error } = await withRecentSyncRuns(
      baseDataSourceQuery(client)
    )
      .eq("workspace_id", input.workspaceId)
      .eq("source_type", input.sourceType)
      .eq("slug", input.sourceSlug)
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

  async function requireGoogleFormsById(input: {
    workspaceId: string
    sourceId: string
  }): Promise<GoogleFormsDataSource> {
    const source = await findByIdForWorkspace(input)
    if (!source || source.type !== "forms") {
      throw new Error("source_not_found")
    }
    return source
  }

  async function requireStripeById(input: {
    workspaceId: string
    sourceId: string
  }): Promise<StripeDataSource> {
    const source = await findByIdForWorkspace(input)
    if (!source || source.type !== "stripe") {
      throw new Error("source_not_found")
    }
    return source
  }

  async function requireMailerLiteById(input: {
    workspaceId: string
    sourceId: string
  }): Promise<MailerLiteDataSource> {
    const source = await findByIdForWorkspace(input)
    if (!source || source.type !== "mailerlite") {
      throw new Error("source_not_found")
    }
    return source
  }

  return {
    async listForWorkspace(workspaceId) {
      const { data, error } = await withRecentSyncRuns(
        baseDataSourceQuery(client)
      )
        .eq("workspace_id", workspaceId)
        .is("disconnected_at", null)
        .order("source_type", { ascending: true })

      if (error)
        throw new Error("Could not load data sources", { cause: error })

      return ((data ?? []) as DataSourceRow[]).map(mapDataSourceRow)
    },

    findBySlugForWorkspace,

    findByIdForWorkspace,

    async connectImap(input) {
      const { data, error } = await client.rpc("connect_imap_data_source", {
        target_workspace_id: input.workspaceId,
        imap_display_name: input.displayName,
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

    async connectGoogleFormsManualCsv(input) {
      const { data, error } = await client.rpc(
        "connect_google_forms_manual_csv_data_source",
        {
          target_workspace_id: input.workspaceId,
          form_external_id: input.source.externalFormId,
          form_connection_mode: input.source.connectionMode,
          form_display_name: input.source.displayName,
          form_mapping: input.source.mapping,
          upload_file_name: input.upload.fileName,
          upload_rows: input.upload.rows,
        }
      )

      if (error) {
        throwDataSourceStoreError(error, "Could not connect Google Forms")
      }

      return requireGoogleFormsById({
        workspaceId: input.workspaceId,
        sourceId: String(data),
      })
    },

    async updateGoogleFormsManualCsv(input) {
      const { error } = await client.rpc(
        "update_google_forms_manual_csv_data_source",
        {
          target_workspace_id: input.workspaceId,
          target_source_id: input.sourceId,
          form_display_name: input.source.displayName,
          form_mapping: input.source.mapping,
          upload_file_name: input.upload.fileName,
          upload_rows: input.upload.rows,
        }
      )

      if (error) {
        throwDataSourceStoreError(error, "Could not update Google Forms")
      }

      return requireGoogleFormsById({
        workspaceId: input.workspaceId,
        sourceId: input.sourceId,
      })
    },

    async connectGoogleFormsApi(input) {
      const { data, error } = await client.rpc(
        "connect_google_forms_api_data_source",
        {
          target_workspace_id: input.workspaceId,
          form_external_id: input.source.externalFormId,
          form_display_name: input.source.displayName,
          form_identity_question_id: input.source.identityQuestionId,
        }
      )

      if (error) {
        throwDataSourceStoreError(error, "Could not connect Google Forms")
      }

      return requireGoogleFormsById({
        workspaceId: input.workspaceId,
        sourceId: String(data),
      })
    },

    async connectStripe(input) {
      const { data, error } = await client.rpc("connect_stripe_data_source", {
        target_workspace_id: input.workspaceId,
        stripe_display_name: input.source.displayName,
        stripe_account_id: input.source.accountId,
        stripe_api_key: input.apiKey,
        stripe_sync_from: input.source.syncFrom,
      })

      if (error) throwDataSourceStoreError(error, "Could not connect Stripe")

      return requireStripeById({
        workspaceId: input.workspaceId,
        sourceId: String(data),
      })
    },

    async connectMailerLite(input) {
      const { data, error } = await client.rpc("connect_mailerlite_data_source", {
        target_workspace_id: input.workspaceId,
        mailerlite_display_name: input.source.displayName,
        mailerlite_account_id: input.source.accountId,
        mailerlite_api_key: input.apiKey,
        mailerlite_sync_from: input.source.syncFrom,
        mailerlite_shops: input.source.shops,
      })

      if (error) throwDataSourceStoreError(error, "Could not connect MailerLite")

      return requireMailerLiteById({
        workspaceId: input.workspaceId,
        sourceId: String(data),
      })
    },

    async updateImapConnection(input) {
      const { error } = await client.rpc("update_imap_connection_settings", {
        target_source_id: input.sourceId,
        target_workspace_id: input.workspaceId,
        imap_display_name: input.displayName,
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

    async requestAllSyncs(input) {
      const { data, error } = await client.rpc(
        "request_all_data_source_syncs",
        {
          target_workspace_id: input.workspaceId,
        }
      )

      if (error) {
        throwDataSourceStoreError(error, "Could not request data source syncs")
      }

      return { queued: typeof data === "number" ? data : 0 }
    },
  }
}

function baseDataSourceQuery(
  client: SupabaseDataSourceClient
): DataSourceQuery {
  return client
    .from("data_sources")
    .select(DATA_SOURCE_COLUMNS) as unknown as DataSourceQuery
}

function withRecentSyncRuns(query: DataSourceQuery): DataSourceQuery {
  return query
    .order("started_at", {
      referencedTable: "data_source_sync_runs",
      ascending: false,
    })
    .limit(5, { referencedTable: "data_source_sync_runs" })
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
  "invalid_google_form_id",
  "invalid_google_forms_csv",
  "invalid_google_forms_csv_mapping",
  "invalid_google_forms_csv_row",
  "invalid_data_source_name",
  "duplicate_data_source_name",
  "duplicate_data_source_config",
  "source_not_found",
  "source_manage_forbidden",
])
