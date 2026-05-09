import type {
  ImapDataSource,
  ImapFolder,
  ImapMessageFilters,
  WorkspaceDataSource,
} from "@/features/data-sources/types"

const CONNECTOR_ID_VALUES = [
  "imap",
  "csv",
  "forms",
  "stripe",
  "mailerlite",
  "calendly",
  "teachable",
] as const

export type ConnectorId = (typeof CONNECTOR_ID_VALUES)[number]

export const CONNECTOR_IDS: ConnectorId[] = [...CONNECTOR_ID_VALUES]

export type DataSourceIcon =
  | "mail"
  | "file-text"
  | "clipboard-list"
  | "credit-card"
  | "calendar"
  | "graduation-cap"
  | "send"

export type DataSourceAuth = "oauth" | "apikey" | "imap" | "csv"

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
}

export type ConnectorDefinition = {
  id: ConnectorId
  icon: DataSourceIcon
  title: string
  sub: string
  category: string
  auth: DataSourceAuth
  isNew?: boolean
}

export type DataSource = ConnectorDefinition & {
  sourceRowId?: string
  connected: boolean
  health?: DataSourceHealth
  lastSync?: string
  summaryStatId?: DataSourceStatId
  stats: DataSourceStat[]
  imap?: DataSourceImapSettings
}

export type HomeSourceRow = {
  id: ConnectorId
  icon: DataSourceIcon
  title: string
  sub: string
  connected: boolean
  status: string
}

export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  {
    id: "imap",
    icon: "mail",
    title: "IMAP mailbox",
    sub: "Read email threads from any IMAP mailbox",
    category: "Mail",
    auth: "imap",
  },
  {
    id: "csv",
    icon: "file-text",
    title: "CSV upload",
    sub: "Import client lists and form exports",
    category: "Files",
    auth: "csv",
  },
  {
    id: "forms",
    icon: "clipboard-list",
    title: "Google Forms",
    sub: "Import intake and feedback responses",
    category: "Forms",
    auth: "oauth",
  },
  {
    id: "stripe",
    icon: "credit-card",
    title: "Stripe",
    sub: "Payments, subscriptions, refunds",
    category: "Billing",
    auth: "oauth",
  },
  {
    id: "mailerlite",
    icon: "send",
    title: "MailerLite",
    sub: "Email marketing & automations",
    category: "Marketing",
    auth: "apikey",
    isNew: true,
  },
  {
    id: "calendly",
    icon: "calendar",
    title: "Calendly",
    sub: "Bookings, no-shows, reschedules",
    category: "Scheduling",
    auth: "oauth",
  },
  {
    id: "teachable",
    icon: "graduation-cap",
    title: "Teachable",
    sub: "Course enrollments & progress",
    category: "Learning",
    auth: "apikey",
  },
]

export function listConnectorDefinitions(
  definitions: ConnectorDefinition[] = CONNECTOR_DEFINITIONS
): ConnectorDefinition[] {
  return [...definitions]
}

export function composeWorkspaceConnectorCatalog(
  workspaceSources: WorkspaceDataSource[],
  definitions: ConnectorDefinition[] = CONNECTOR_DEFINITIONS
): DataSource[] {
  const byType = new Map<string, WorkspaceDataSource>(
    workspaceSources.map((source) => [source.type, source] as const)
  )

  return definitions.map((definition) => {
    const workspaceSource = byType.get(definition.id)
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
    },
  }
}

function imapHealth(source: ImapDataSource): DataSourceHealth {
  if (source.status === "error" || source.sync.status === "error") {
    return "error"
  }
  return "healthy"
}

function syncStatusLabel(source: ImapDataSource) {
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
