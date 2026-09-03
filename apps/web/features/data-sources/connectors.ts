import type {
  GoogleFormsDataSource,
  GoogleFormsUpload,
  ImapDataSource,
  ImapFolder,
  ImapMessageFilters,
  DataSourceSyncRun,
  StripeDataSource,
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
  sourceId: string
  externalFormId: string
  displayName: string
  connectionMode: GoogleFormsDataSource["connectionMode"]
  mapping: GoogleFormsDataSource["mapping"]
  identityQuestionId?: string | null
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

export type DataSourceStripeSettings = {
  accountId: string
  syncFrom: string
  livemode: boolean
  apiKeyMasked?: string
  syncStatus?: "idle" | "queued" | "running" | "error"
  lastError?: string | null
  syncRuns?: DataSourceSyncRun[]
}

export type ConnectorDefinition = ConnectorMetadata

export type ConnectorTypeCatalogItem = ConnectorDefinition & {
  kind: "connector_type"
  connected: false
  stats: []
}

export type WorkspaceDataSourceCatalogItem = ConnectorDefinition & {
  kind: "data_source"
  sourceId: string
  sourceType: ConnectorId
  sourceSlug: string
  connected: true
  health: DataSourceHealth
  lastSync: string
  summaryStatId: DataSourceStatId
  stats: DataSourceStat[]
  imap?: DataSourceImapSettings
  forms?: DataSourceGoogleFormsSettings
  stripe?: DataSourceStripeSettings
}

export type DataSource = ConnectorTypeCatalogItem | WorkspaceDataSourceCatalogItem

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
  const connected = workspaceSources.flatMap((source) => {
    const definition = definitions.find(
      (candidate) => candidate.id === source.type
    )
    if (!definition) return []
    if (source.type === "imap") return [connectedImapSource(definition, source)]
    if (source.type === "forms")
      return [connectedGoogleFormsSource(definition, source)]
    if (source.type === "stripe")
      return [connectedStripeSource(definition, source)]
    return []
  })

  return [...connected, ...definitions.map(disconnectedSource)]
}

export function connectedSources(
  sources: DataSource[]
): WorkspaceDataSourceCatalogItem[] {
  return sources.filter(
    (source): source is WorkspaceDataSourceCatalogItem =>
      source.kind === "data_source"
  )
}

export function availableSources(
  sources: DataSource[]
): ConnectorTypeCatalogItem[] {
  return sources.filter(
    (source): source is ConnectorTypeCatalogItem =>
      source.kind === "connector_type"
  )
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
  return (
    sources.find(
      (source) => source.kind === "connector_type" && source.id === id
    ) ??
    sources.find((source) => source.id === id) ??
    null
  )
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

function disconnectedSource(source: ConnectorDefinition): ConnectorTypeCatalogItem {
  return {
    ...source,
    kind: "connector_type",
    connected: false,
    stats: [],
  }
}

function connectedImapSource(
  catalogSource: ConnectorDefinition,
  source: ImapDataSource
): WorkspaceDataSourceCatalogItem {
  const syncLabel = syncStatusLabel(source)

  return {
    ...catalogSource,
    kind: "data_source",
    title: source.displayName,
    sourceId: source.id,
    sourceType: source.type,
    sourceSlug: source.sourceSlug,
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
  source: GoogleFormsDataSource
): WorkspaceDataSourceCatalogItem {
  const syncLabel = syncStatusLabel(source)
  const rowCount = source.latestUpload?.rowCount ?? 0
  const live = source.connectionMode === "api"

  return {
    ...catalogSource,
    kind: "data_source",
    title: source.displayName,
    auth: "multi",
    sourceId: source.id,
    sourceType: source.type,
    sourceSlug: source.sourceSlug,
    sub: catalogSource.title,
    connected: true,
    health: googleFormsHealth(source),
    lastSync: syncLabel.toLowerCase(),
    summaryStatId: live ? "synced" : "submissions",
    stats: live
      ? [
          { id: "synced", label: "Sync", value: syncLabel },
          { id: "events", label: "Mode", value: "Live" },
        ]
      : [
          { id: "submissions", label: "Responses", value: String(rowCount) },
          {
            id: "events",
            label: "Files",
            value: source.latestUpload ? "1" : "0",
          },
          { id: "synced", label: "Sync", value: syncLabel },
        ],
    forms: {
      connections: [
        {
          sourceId: source.id,
          externalFormId: source.externalFormId,
          displayName: source.displayName,
          connectionMode: source.connectionMode,
          mapping: source.mapping,
          identityQuestionId: source.identityQuestionId ?? null,
          latestUpload: source.latestUpload,
          syncStatus: source.sync.status,
          lastError: source.sync.lastError,
          syncRuns: source.syncRuns ?? [],
        },
      ],
    },
  }
}

function connectedStripeSource(
  catalogSource: ConnectorDefinition,
  source: StripeDataSource
): WorkspaceDataSourceCatalogItem {
  const syncLabel = syncStatusLabel(source)
  return {
    ...catalogSource,
    kind: "data_source",
    title: source.displayName,
    sourceId: source.id,
    sourceType: source.type,
    sourceSlug: source.sourceSlug,
    sub: catalogSource.title,
    connected: true,
    health: sourceHealth(source),
    lastSync: syncLabel.toLowerCase(),
    summaryStatId: "synced",
    stats: [
      { id: "synced", label: "Sync", value: syncLabel },
      { id: "events", label: "Mode", value: source.livemode ? "Live" : "Test" },
    ],
    stripe: {
      accountId: source.accountId,
      syncFrom: source.syncFrom,
      livemode: source.livemode,
      apiKeyMasked: source.secret?.maskedValue,
      syncStatus: source.sync.status,
      lastError: source.sync.lastError,
      syncRuns: source.syncRuns ?? [],
    },
  }
}

function sourceHealth(source: WorkspaceDataSource): DataSourceHealth {
  if (source.status === "error" || source.sync.status === "error") return "error"
  return "healthy"
}

function imapHealth(source: ImapDataSource): DataSourceHealth {
  if (source.status === "error" || source.sync.status === "error") {
    return "error"
  }
  return "healthy"
}

function googleFormsHealth(source: GoogleFormsDataSource): DataSourceHealth {
  if (source.status === "error" || source.sync.status === "error")
    return "error"
  return "healthy"
}

function syncStatusLabel(source: WorkspaceDataSource) {
  if (source.sync.status === "error") return "Error"
  if (source.sync.status === "running") return "Syncing"
  if (source.sync.status === "queued") return "Queued"
  if (source.sync.lastSyncedAt) return "Synced"
  return "Ready"
}

function historyWindowLabel(value: ImapDataSource["intake"]["historyWindow"]) {
  if (value === "30d") return "30 days"
  if (value === "90d") return "90 days"
  if (value === "all") return "All"
  return "12 months"
}
