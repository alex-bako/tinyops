import type {
  GoogleFormsDataSource,
  GoogleFormsUpload,
  ImapDataSource,
  ImapFolder,
  ImapMessageFilters,
  DataSourceSyncRun,
  WorkspaceDataSource,
} from "@/features/data-sources/types"
import {
  CONNECTOR_IDS,
  CONNECTOR_METADATA,
  getConnectorMetadata,
  listConnectorMetadata,
  type ConnectorId,
  type ConnectorMetadata,
  type DataSourceIcon,
} from "@/features/data-sources/connector-metadata"

export { CONNECTOR_IDS, getConnectorMetadata }
export type {
  ConnectorCardinality,
  ConnectorId,
  ConnectorMetadata,
  DataSourceAuth,
  DataSourceIcon,
} from "@/features/data-sources/connector-metadata"

export type DataSourceHealth = "healthy" | "stale" | "error"

export type DataSourceStatId =
  | "synced"
  | "events"
  | "window"
  | "imported"
  | "matched"
  | "new"
  | "submissions"
  | "sensitive"

export type DataSourceStat = {
  id: DataSourceStatId
  label: string
  value: string
}

export type DataSourceGoogleFormsConnection = {
  sourceRowId: string
  externalFormId: string
  displayName: string
  connectionMode: GoogleFormsDataSource["connectionMode"]
  mapping: GoogleFormsDataSource["mapping"]
  latestUpload: GoogleFormsUpload | null
  syncStatus?: "idle" | "queued" | "running" | "error"
  lastError?: string | null
  syncRuns?: DataSourceSyncRun[]
}

export type DataSourceGoogleFormsSettings = {
  connections: DataSourceGoogleFormsConnection[]
}

export type DataSourceImapSettings = {
  host: string
  port: number
  encryption: "ssl" | "starttls" | "none"
  username: string
  historyWindow: "30d" | "90d" | "12mo" | "all"
  watchedFolders: string[]
  skipSenders: string[]
  messageFilters: ImapMessageFilters
  availableFolders: ImapFolder[]
  passwordMasked?: string
  syncStatus?: "idle" | "queued" | "running" | "error"
  lastError?: string | null
  syncRuns?: DataSourceSyncRun[]
}

export type ConnectorDefinition = ConnectorMetadata

export type DataSource = ConnectorDefinition & {
  sourceRowId?: string
  sourceRowIds: string[]
  connected: boolean
  health?: DataSourceHealth
  lastSync?: string
  summaryStatId?: DataSourceStatId
  stats: DataSourceStat[]
  imap?: DataSourceImapSettings
  forms?: DataSourceGoogleFormsSettings
}

export type HomeSourceRow = {
  id: ConnectorId
  icon: DataSourceIcon
  title: string
  sub: string
  connected: boolean
  status: string
}

export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = CONNECTOR_METADATA

export function listConnectorDefinitions(
  definitions: ConnectorDefinition[] = CONNECTOR_DEFINITIONS
): ConnectorDefinition[] {
  return listConnectorMetadata(definitions)
}

export function composeWorkspaceConnectorCatalog(
  workspaceSources: WorkspaceDataSource[],
  definitions: ConnectorDefinition[] = CONNECTOR_DEFINITIONS
): DataSource[] {
  const googleFormsSources = workspaceSources.filter(isGoogleFormsSource)

  return definitions.map((definition) => {
    if (definition.id === "forms" && googleFormsSources.length > 0) {
      return connectedGoogleFormsSource(definition, googleFormsSources)
    }

    const workspaceSource = workspaceSources.find(
      (source) => source.type === definition.id
    )
    if (!workspaceSource) return disconnectedSource(definition)

    if (workspaceSource.type === "imap") {
      return connectedImapSource(definition, workspaceSource)
    }

    return disconnectedSource(definition)
  })
}

export function connectedSources(sources: DataSource[]): DataSource[] {
  return sources.filter((source) => source.connected)
}

export function availableSources(sources: DataSource[]): DataSource[] {
  return sources.filter((source) => !source.connected)
}

export function sourceStatusLabel(source: DataSource): string {
  if (!source.connected) return "Not connected"
  if (!source.summaryStatId) return "Connected"
  return (
    source.stats.find((stat) => stat.id === source.summaryStatId)?.value ??
    "Connected"
  )
}

export function findSourceById(
  id: string,
  sources: DataSource[] = composeWorkspaceConnectorCatalog([])
): DataSource | null {
  return sources.find((source) => source.id === id) ?? null
}

export function homeSourceRows(sources: DataSource[]): HomeSourceRow[] {
  return connectedSources(sources).map((source) => ({
    id: source.id,
    icon: source.icon,
    title: source.title,
    sub: source.sub,
    connected: source.connected,
    status: sourceStatusLabel(source),
  }))
}

function disconnectedSource(source: ConnectorDefinition): DataSource {
  return {
    ...source,
    connected: false,
    sourceRowIds: [],
    stats: [],
  }
}

function connectedImapSource(
  catalogSource: ConnectorDefinition,
  source: ImapDataSource
): DataSource {
  const syncLabel = syncStatusLabel(source)

  return {
    ...catalogSource,
    sourceRowId: source.id,
    sourceRowIds: [source.id],
    sub: source.connection.username,
    connected: true,
    health: imapHealth(source),
    lastSync: syncLabel.toLowerCase(),
    summaryStatId: "synced",
    stats: [
      { id: "synced", label: "Sync", value: syncLabel },
      {
        id: "window",
        label: "Window",
        value: historyWindowLabel(source.intake.historyWindow),
      },
      {
        id: "events",
        label: "Folders",
        value: String(source.intake.watchedFolders.length),
      },
    ],
    imap: {
      ...source.connection,
      ...source.intake,
      ...source.folderSnapshot,
      passwordMasked: source.secret?.maskedValue,
      syncStatus: source.sync.status,
      lastError: source.sync.lastError,
      syncRuns: source.syncRuns ?? [],
    },
  }
}

function connectedGoogleFormsSource(
  catalogSource: ConnectorDefinition,
  sources: GoogleFormsDataSource[]
): DataSource {
  const orderedSources = [...sources].sort(compareGoogleFormsSources)
  const syncLabel = googleFormsSyncStatusLabel(orderedSources)
  const rowCount = orderedSources.reduce(
    (total, source) => total + (source.latestUpload?.rowCount ?? 0),
    0
  )

  return {
    ...catalogSource,
    auth: "multi",
    sourceRowIds: orderedSources.map((source) => source.id),
    ...(orderedSources.length === 1
      ? { sourceRowId: orderedSources[0]?.id }
      : {}),
    sub:
      orderedSources.length === 1
        ? orderedSources[0]?.displayName ?? catalogSource.sub
        : `${orderedSources.length} forms connected`,
    connected: true,
    health: orderedSources.some((source) => googleFormsHealth(source) === "error")
      ? "error"
      : "healthy",
    lastSync: syncLabel.toLowerCase(),
    summaryStatId: "submissions",
    stats: [
      { id: "submissions", label: "Responses", value: String(rowCount) },
      { id: "events", label: "Forms", value: String(orderedSources.length) },
      { id: "synced", label: "Sync", value: syncLabel },
    ],
    forms: {
      connections: orderedSources.map((source) => ({
        sourceRowId: source.id,
        externalFormId: source.externalFormId,
        displayName: source.displayName,
        connectionMode: source.connectionMode,
        mapping: source.mapping,
        latestUpload: source.latestUpload,
        syncStatus: source.sync.status,
        lastError: source.sync.lastError,
        syncRuns: source.syncRuns ?? [],
      })),
    },
  }
}

function imapHealth(source: ImapDataSource): DataSourceHealth {
  if (source.status === "error" || source.sync.status === "error") {
    return "error"
  }
  return "healthy"
}

function googleFormsHealth(source: GoogleFormsDataSource): DataSourceHealth {
  if (source.status === "error" || source.sync.status === "error") return "error"
  return "healthy"
}

function syncStatusLabel(source: ImapDataSource) {
  if (source.sync.status === "error") return "Error"
  if (source.sync.status === "running") return "Syncing"
  if (source.sync.status === "queued") return "Queued"
  if (source.sync.lastSyncedAt) return "Synced"
  return "Ready"
}

function googleFormsSyncStatusLabel(sources: GoogleFormsDataSource[]) {
  if (sources.some((source) => source.sync.status === "error")) return "Error"
  if (sources.some((source) => source.sync.status === "running")) return "Syncing"
  if (sources.some((source) => source.sync.status === "queued")) return "Queued"
  if (sources.some((source) => source.sync.lastSyncedAt)) return "Synced"
  return "Ready"
}

function historyWindowLabel(value: ImapDataSource["intake"]["historyWindow"]) {
  if (value === "30d") return "30 days"
  if (value === "90d") return "90 days"
  if (value === "all") return "All"
  return "12 months"
}

function isGoogleFormsSource(
  source: WorkspaceDataSource
): source is GoogleFormsDataSource {
  return source.type === "forms"
}

function compareGoogleFormsSources(
  left: GoogleFormsDataSource,
  right: GoogleFormsDataSource
) {
  const rightUploaded = right.latestUpload?.uploadedAt ?? right.updatedAt
  const leftUploaded = left.latestUpload?.uploadedAt ?? left.updatedAt
  return rightUploaded.localeCompare(leftUploaded)
}
