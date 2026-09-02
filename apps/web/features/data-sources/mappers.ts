import type { Json } from "@/lib/database.types"
import {
  buildImapConnectionConfig,
  buildImapFolderSnapshot,
  buildImapIntakeSettings,
  type ImapMessageFiltersCommand,
} from "@/features/data-sources/imap"
import type {
  GoogleFormsConnectionMode,
  GoogleFormsManualCsvMapping,
} from "@/features/data-sources/google-forms"
import type {
  DataSourceSecret,
  DataSourceSyncRun,
  DataSourceSyncState,
  GoogleFormsDataSource,
  GoogleFormsUpload,
  ImapConnectionConfig,
  ImapDataSource,
  ImapFolderSnapshot,
  ImapIntakeSettings,
  WorkspaceDataSource,
} from "@/features/data-sources/types"

export type DataSourceRow = {
  id: string
  workspace_id: string
  source_type: string
  slug: string
  display_name: string
  status: string
  config_version: number
  config: Json
  created_at: string
  updated_at: string
  data_source_intake_configs?:
    | DataSourceIntakeConfigRow
    | DataSourceIntakeConfigRow[]
    | null
  data_source_secrets?: DataSourceSecretRow[] | null
  data_source_sync_states?:
    | DataSourceSyncStateRow
    | DataSourceSyncStateRow[]
    | null
  data_source_sync_runs?: DataSourceSyncRunRow[] | null
}

export type DataSourceIntakeConfigRow = {
  history_window: string
  watched_folders: string[]
  skip_senders: string[]
  message_filters: Json
  available_folders: Json
}

export type DataSourceSecretRow = {
  purpose: string
  masked_value: string
  replaced_at?: string | null
}

export type DataSourceSyncStateRow = {
  status: string
  cursor: Json
  last_error: string | null
  last_synced_at: string | null
}

export type DataSourceSyncRunRow = {
  trigger: string
  status: string
  started_at: string
  finished_at: string | null
  error_code: string | null
  error_message: string | null
  cause_message: string | null
  persisted_counts: Json
  diagnostics: Json
}

export function mapDataSourceRow(row: DataSourceRow): WorkspaceDataSource {
  if (row.source_type === "imap") {
    return mapImapDataSourceRow(row)
  }

  if (row.source_type === "forms") {
    return mapGoogleFormsDataSourceRow(row)
  }

  throw new Error(`Unsupported data source type: ${row.source_type}`)
}

function mapImapDataSourceRow(row: DataSourceRow): ImapDataSource {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: "imap",
    sourceSlug: row.slug,
    displayName: row.display_name,
    status: coerceStatus(row.status),
    configVersion: 1,
    connection: mapImapConnectionConfig(row.config),
    intake: mapImapIntakeSettings(row.data_source_intake_configs, row.config),
    folderSnapshot: mapImapFolderSnapshot(
      row.data_source_intake_configs,
      row.config
    ),
    secret: mapSecret(row.data_source_secrets),
    sync: mapSyncState(row.data_source_sync_states),
    syncRuns: mapSyncRuns(row.data_source_sync_runs),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies ImapDataSource
}

function mapGoogleFormsDataSourceRow(
  row: DataSourceRow
): GoogleFormsDataSource {
  const config = jsonObject(row.config)
  if (!config) throw new Error("Invalid Google Forms config")

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: "forms",
    sourceSlug: row.slug,
    displayName: row.display_name,
    status: coerceStatus(row.status),
    configVersion: 1,
    externalFormId: stringValue(config.externalFormId),
    connectionMode: coerceGoogleFormsConnectionMode(config.connectionMode),
    mapping: googleFormsMapping(config.mapping),
    identityQuestionId: stringValue(config.identityQuestionId) || null,
    latestUpload: googleFormsUpload(config.latestUpload),
    sync: mapSyncState(row.data_source_sync_states),
    syncRuns: mapSyncRuns(row.data_source_sync_runs),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies GoogleFormsDataSource
}

function mapImapConnectionConfig(config: Json): ImapConnectionConfig {
  const value = jsonObject(config)
  if (!value) throw new Error("Invalid IMAP config")

  return buildImapConnectionConfig({
    host: stringValue(value.host),
    port: numberValue(value.port, 993),
    encryption: stringValue(value.encryption),
    username: stringValue(value.username),
  })
}

function mapImapIntakeSettings(
  rowOrRows: DataSourceRow["data_source_intake_configs"],
  legacyConfig: Json
): ImapIntakeSettings {
  const row = Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows
  const legacy = jsonObject(legacyConfig)

  return buildImapIntakeSettings({
    historyWindow: row?.history_window ?? stringValue(legacy?.historyWindow),
    watchedFolders:
      row?.watched_folders ?? stringArray(legacy?.watchedFolders, ["INBOX"]),
    skipSenders: row?.skip_senders ?? stringArray(legacy?.skipSenders, []),
    messageFilters: messageFiltersValue(
      row?.message_filters ?? legacy?.messageFilters
    ),
  })
}

function mapImapFolderSnapshot(
  rowOrRows: DataSourceRow["data_source_intake_configs"],
  legacyConfig: Json
): ImapFolderSnapshot {
  const row = Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows
  const legacy = jsonObject(legacyConfig)
  return buildImapFolderSnapshot(
    row?.available_folders ?? legacy?.availableFolders
  )
}

function mapSecret(
  rows: DataSourceSecretRow[] | null | undefined
): DataSourceSecret | null {
  const active = rows?.find((row) => !row.replaced_at)
  if (!active || active.purpose !== "imap_password") return null

  return {
    purpose: "imap_password",
    maskedValue: active.masked_value,
  }
}

function mapSyncState(
  rowOrRows:
    | DataSourceSyncStateRow
    | DataSourceSyncStateRow[]
    | null
    | undefined
): DataSourceSyncState {
  const row = Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows

  return {
    status: coerceSyncStatus(row?.status),
    cursor: jsonObjectOrNull(row?.cursor),
    lastError: row?.last_error ?? null,
    lastSyncedAt: row?.last_synced_at ?? null,
  }
}

function mapSyncRuns(
  rows: DataSourceSyncRunRow[] | null | undefined
): DataSourceSyncRun[] {
  return [...(rows ?? [])]
    .sort((left, right) => right.started_at.localeCompare(left.started_at))
    .slice(0, 5)
    .map((row) => ({
      trigger: row.trigger,
      status: coerceSyncRunStatus(row.status),
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      errorCode: row.error_code,
      errorMessage: row.error_message,
      causeMessage: row.cause_message,
      persistedCounts: jsonObjectOrNull(row.persisted_counts),
      diagnostics: jsonObjectOrNull(row.diagnostics),
    }))
}

function coerceStatus(value: string): WorkspaceDataSource["status"] {
  if (value === "error" || value === "disconnected") return value
  return "connected"
}

function coerceSyncStatus(
  value: string | undefined
): DataSourceSyncState["status"] {
  if (value === "running" || value === "error" || value === "idle") return value
  return "queued"
}

function coerceSyncRunStatus(value: string): DataSourceSyncRun["status"] {
  if (value === "succeeded" || value === "failed") return value
  return "running"
}

function jsonObject(value: Json | undefined): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function jsonObjectOrNull(
  value: Json | undefined
): Record<string, unknown> | null {
  return jsonObject(value)
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function stringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : fallback
}

function messageFiltersValue(
  value: unknown
): ImapMessageFiltersCommand | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ImapMessageFiltersCommand)
    : undefined
}

function coerceGoogleFormsConnectionMode(
  value: unknown
): GoogleFormsConnectionMode {
  if (value === "manual_csv" || value === "api") return value
  return "manual_csv"
}

function googleFormsMapping(value: unknown): GoogleFormsManualCsvMapping {
  const mapping = jsonObject(value as Json | undefined)
  return {
    identityColumn: stringValue(mapping?.identityColumn),
    timestampColumn: stringValue(mapping?.timestampColumn),
  }
}

function googleFormsUpload(value: unknown): GoogleFormsUpload | null {
  const upload = jsonObject(value as Json | undefined)
  if (!upload) return null
  const id = stringValue(upload.id)
  const fileName = stringValue(upload.fileName)
  const rowCount = numberValue(upload.rowCount, 0)
  const uploadedAt = stringValue(upload.uploadedAt)
  if (!id || !fileName || !uploadedAt) return null
  return { id, fileName, rowCount, uploadedAt }
}
