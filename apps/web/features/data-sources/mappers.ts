import type { Json } from "@/lib/database.types"
import {
  buildImapConnectionConfig,
  buildImapFolderSnapshot,
  buildImapIntakeSettings,
  coerceImapHistoryWindow,
  type ImapMessageFiltersCommand,
} from "@/features/data-sources/imap"
import type {
  DataSourceSecret,
  DataSourceSyncState,
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
  display_name: string
  status: string
  config_version: number
  config: Json
  created_at: string
  updated_at: string
  data_source_intake_configs?: DataSourceIntakeConfigRow | DataSourceIntakeConfigRow[] | null
  data_source_secrets?: DataSourceSecretRow[] | null
  data_source_sync_states?: DataSourceSyncStateRow | DataSourceSyncStateRow[] | null
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
  history_window: string
  cursor: Json
  last_error: string | null
  last_synced_at: string | null
}

export function mapDataSourceRow(row: DataSourceRow): WorkspaceDataSource {
  if (row.source_type !== "imap") {
    throw new Error(`Unsupported data source type: ${row.source_type}`)
  }

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: "imap",
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies ImapDataSource
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
    messageFilters: messageFiltersValue(row?.message_filters ?? legacy?.messageFilters),
  })
}

function mapImapFolderSnapshot(
  rowOrRows: DataSourceRow["data_source_intake_configs"],
  legacyConfig: Json
): ImapFolderSnapshot {
  const row = Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows
  const legacy = jsonObject(legacyConfig)
  return buildImapFolderSnapshot(row?.available_folders ?? legacy?.availableFolders)
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
  rowOrRows: DataSourceSyncStateRow | DataSourceSyncStateRow[] | null | undefined
): DataSourceSyncState {
  const row = Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows

  return {
    status: coerceSyncStatus(row?.status),
    historyWindow: coerceImapHistoryWindow(row?.history_window),
    cursor: jsonObjectOrNull(row?.cursor),
    lastError: row?.last_error ?? null,
    lastSyncedAt: row?.last_synced_at ?? null,
  }
}

function coerceStatus(value: string): WorkspaceDataSource["status"] {
  if (value === "error" || value === "disconnected") return value
  return "connected"
}

function coerceSyncStatus(value: string | undefined): DataSourceSyncState["status"] {
  if (value === "running" || value === "error" || value === "idle") return value
  return "queued"
}

function jsonObject(value: Json | undefined): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function jsonObjectOrNull(value: Json | undefined): Record<string, unknown> | null {
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
