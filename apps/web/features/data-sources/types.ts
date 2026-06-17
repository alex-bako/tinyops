import type { SourceId } from "@/lib/sources"
import type {
  GoogleFormsConnectionMode,
  GoogleFormsManualCsvMapping,
  GoogleFormsManualCsvUploadRow,
  GoogleFormsSourceConfig,
} from "@/features/data-sources/google-forms"
import type { WorkspaceRole } from "@/features/workspaces/types"

export type DataSourceWorkspace = {
  id: string
  role: WorkspaceRole
}

export type DataSourceStatus = "connected" | "error" | "disconnected"
export type DataSourceSyncStatus = "idle" | "queued" | "running" | "error"
export type DataSourceSyncRunStatus = "running" | "succeeded" | "failed"
export type DataSourceSecretPurpose =
  | "imap_password"
  | "gmail_oauth_refresh_token"

export type ImapEncryption = "ssl" | "starttls" | "none"
export type ImapHistoryWindow = "30d" | "90d" | "12mo" | "all"

export type ImapConnectionConfig = {
  host: string
  port: number
  encryption: ImapEncryption
  username: string
}

export type ImapFolder = {
  path: string
  messages: number | null
  specialUse?: string | null
  flags?: string[]
}

export type ImapMessageFilterField = "from" | "to" | "subject" | "body"
export type ImapMessageFilterOperator =
  | "is"
  | "is_not"
  | "contains"
  | "does_not_contain"

export type ImapMessageFilterRule = {
  id: string
  field: ImapMessageFilterField
  operator: ImapMessageFilterOperator
  value: string
}

export type ImapMessageFilters = {
  mode: "and"
  rules: ImapMessageFilterRule[]
}

export type ImapIntakeSettings = {
  historyWindow: ImapHistoryWindow
  watchedFolders: string[]
  skipSenders: string[]
  messageFilters: ImapMessageFilters
}

export type ImapFolderSnapshot = {
  availableFolders: ImapFolder[]
}

export type DataSourceSecret = {
  purpose: DataSourceSecretPurpose
  maskedValue: string
}

export type DataSourceSyncState = {
  status: DataSourceSyncStatus
  cursor: Record<string, unknown> | null
  lastError: string | null
  lastSyncedAt: string | null
}

export type DataSourceSyncRun = {
  trigger: string
  status: DataSourceSyncRunStatus
  startedAt: string
  finishedAt: string | null
  errorCode: string | null
  errorMessage: string | null
  causeMessage: string | null
  persistedCounts: Record<string, unknown> | null
  diagnostics?: Record<string, unknown> | null
}

export type ImapDataSource = {
  id: string
  workspaceId: string
  type: Extract<SourceId, "imap">
  sourceSlug: string
  displayName: string
  status: DataSourceStatus
  configVersion: 1
  connection: ImapConnectionConfig
  intake: ImapIntakeSettings
  folderSnapshot: ImapFolderSnapshot
  secret: DataSourceSecret | null
  sync: DataSourceSyncState
  syncRuns?: DataSourceSyncRun[]
  createdAt: string
  updatedAt: string
}

export type GmailConnectionConfig = {
  emailAddress: string
}

/**
 * Gmail reuses the IMAP intake + folder-snapshot shapes (DRY): `watchedFolders`
 * holds Gmail **label IDs** and `folderSnapshot.availableFolders` holds the
 * connect-time label snapshot. Same `data_source_intake_configs` table backs both.
 */
export type GmailDataSource = {
  id: string
  workspaceId: string
  type: Extract<SourceId, "gmail">
  sourceSlug: string
  displayName: string
  status: DataSourceStatus
  configVersion: 1
  connection: GmailConnectionConfig
  intake: ImapIntakeSettings
  folderSnapshot: ImapFolderSnapshot
  secret: DataSourceSecret | null
  sync: DataSourceSyncState
  syncRuns?: DataSourceSyncRun[]
  createdAt: string
  updatedAt: string
}

export type GoogleFormsUpload = {
  id: string
  fileName: string
  rowCount: number
  uploadedAt: string
}

export type GoogleFormsDataSource = {
  id: string
  workspaceId: string
  type: Extract<SourceId, "forms">
  sourceSlug: string
  displayName: string
  status: DataSourceStatus
  configVersion: 1
  externalFormId: string
  connectionMode: GoogleFormsConnectionMode
  mapping: GoogleFormsManualCsvMapping
  latestUpload: GoogleFormsUpload | null
  sync: DataSourceSyncState
  syncRuns?: DataSourceSyncRun[]
  createdAt: string
  updatedAt: string
}

export type WorkspaceDataSource =
  | ImapDataSource
  | GmailDataSource
  | GoogleFormsDataSource

export type ConnectImapInput = {
  workspaceId: string
  displayName: string
  connection: ImapConnectionConfig
  intake: ImapIntakeSettings
  folderSnapshot: ImapFolderSnapshot
  password: string
}

export type ConnectGoogleFormsManualCsvInput = {
  workspaceId: string
  source: GoogleFormsSourceConfig
  upload: {
    fileName: string
    rows: GoogleFormsManualCsvUploadRow[]
  }
}

export type UpdateGoogleFormsManualCsvInput =
  ConnectGoogleFormsManualCsvInput & {
    sourceId: string
  }

export type UpdateImapConnectionInput = {
  sourceId: string
  workspaceId: string
  displayName: string
  connection: ImapConnectionConfig
  folderSnapshot: ImapFolderSnapshot
  password?: string
}

export type UpdateImapIntakeInput = {
  sourceId: string
  workspaceId: string
  intake: ImapIntakeSettings
}

export type UpdateImapFolderSnapshotInput = {
  sourceId: string
  workspaceId: string
  folderSnapshot: ImapFolderSnapshot
}

export type DataSourceQueryPort = {
  listForWorkspace(workspaceId: string): Promise<WorkspaceDataSource[]>
  findBySlugForWorkspace(input: {
    workspaceId: string
    sourceType: SourceId
    sourceSlug: string
  }): Promise<WorkspaceDataSource | null>
  findByIdForWorkspace(input: {
    workspaceId: string
    sourceId: string
  }): Promise<WorkspaceDataSource | null>
}

export type ImapSourceCommandPort = {
  connectImap(input: ConnectImapInput): Promise<ImapDataSource>
  updateImapConnection(
    input: UpdateImapConnectionInput
  ): Promise<ImapDataSource>
  updateImapIntake(input: UpdateImapIntakeInput): Promise<ImapDataSource>
  updateImapFolderSnapshot(
    input: UpdateImapFolderSnapshotInput
  ): Promise<ImapDataSource>
}

export type GoogleFormsSourceCommandPort = {
  connectGoogleFormsManualCsv(
    input: ConnectGoogleFormsManualCsvInput
  ): Promise<GoogleFormsDataSource>
  updateGoogleFormsManualCsv(
    input: UpdateGoogleFormsManualCsvInput
  ): Promise<GoogleFormsDataSource>
}

export type SourceLifecycleCommandPort = {
  disconnect(input: { workspaceId: string; sourceId: string }): Promise<void>
  requestSync(input: { workspaceId: string; sourceId: string }): Promise<void>
  requestAllSyncs(input: { workspaceId: string }): Promise<{ queued: number }>
}

export type DataSourceStore = DataSourceQueryPort &
  ImapSourceCommandPort &
  GoogleFormsSourceCommandPort &
  SourceLifecycleCommandPort

export type ImapConnectionTestInput = ImapConnectionConfig & {
  password: string
}

export type ImapConnectionTestResult = {
  folders: Array<{ path: string; messages: number | null }>
}

export type ImapConnectionTester = {
  test(input: ImapConnectionTestInput): Promise<ImapConnectionTestResult>
}
