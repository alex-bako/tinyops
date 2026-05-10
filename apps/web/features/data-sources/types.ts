import type { SourceId } from "@/lib/sources"
import type { WorkspaceRole } from "@/features/workspaces/types"

export type DataSourceWorkspace = {
  id: string
  role: WorkspaceRole
}

export type DataSourceStatus = "connected" | "error" | "disconnected"
export type DataSourceSyncStatus = "idle" | "queued" | "running" | "error"
export type DataSourceSyncRunStatus = "running" | "succeeded" | "failed"
export type DataSourceSecretPurpose = "imap_password"

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
  historyWindow: ImapHistoryWindow
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

export type WorkspaceDataSource = ImapDataSource

export type ConnectImapInput = {
  workspaceId: string
  connection: ImapConnectionConfig
  intake: ImapIntakeSettings
  folderSnapshot: ImapFolderSnapshot
  password: string
}

export type UpdateImapConnectionInput = {
  sourceId: string
  workspaceId: string
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

export type DataSourceReader = {
  listForWorkspace(workspaceId: string): Promise<WorkspaceDataSource[]>
  findForWorkspace(input: {
    workspaceId: string
    sourceType: Extract<SourceId, "imap">
  }): Promise<WorkspaceDataSource | null>
  findByIdForWorkspace(input: {
    workspaceId: string
    sourceId: string
  }): Promise<WorkspaceDataSource | null>
}

export type DataSourceCommandStore = DataSourceReader & {
  connectImap(input: ConnectImapInput): Promise<ImapDataSource>
  updateImapConnection(input: UpdateImapConnectionInput): Promise<ImapDataSource>
  updateImapIntake(input: UpdateImapIntakeInput): Promise<ImapDataSource>
  updateImapFolderSnapshot(
    input: UpdateImapFolderSnapshotInput
  ): Promise<ImapDataSource>
  disconnect(input: { workspaceId: string; sourceId: string }): Promise<void>
  requestSync(input: { workspaceId: string; sourceId: string }): Promise<void>
}

export type DataSourceStore = DataSourceCommandStore

export type ImapConnectionTestInput = ImapConnectionConfig & {
  password: string
}

export type ImapConnectionTestResult = {
  folders: Array<{ path: string; messages: number | null }>
}

export type ImapConnectionTester = {
  test(input: ImapConnectionTestInput): Promise<ImapConnectionTestResult>
}
