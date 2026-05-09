import type { SourceId } from "@/lib/sources"
import type { WorkspaceRole } from "@/features/workspaces/types"

export type DataSourceWorkspace = {
  id: string
  role: WorkspaceRole
}

export type DataSourceStatus = "connected" | "error" | "disconnected"
export type DataSourceSyncStatus = "idle" | "queued" | "running" | "error"
export type DataSourceSecretPurpose = "imap_password"

export type ImapEncryption = "ssl" | "starttls" | "none"
export type ImapHistoryWindow = "30d" | "90d" | "12mo" | "all"

export type ImapConfig = {
  host: string
  port: number
  encryption: ImapEncryption
  username: string
  historyWindow: ImapHistoryWindow
  watchedFolders: string[]
  skipSenders: string[]
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

export type ImapDataSource = {
  id: string
  workspaceId: string
  type: Extract<SourceId, "imap">
  displayName: string
  status: DataSourceStatus
  configVersion: 1
  config: ImapConfig
  secret: DataSourceSecret | null
  sync: DataSourceSyncState
  createdAt: string
  updatedAt: string
}

export type WorkspaceDataSource = ImapDataSource

export type ConnectImapInput = {
  workspaceId: string
  config: ImapConfig
  password: string
}

export type UpdateImapConfigInput = {
  sourceId: string
  workspaceId: string
  config: ImapConfig
}

export type DataSourceStore = {
  listForWorkspace(workspaceId: string): Promise<WorkspaceDataSource[]>
  findForWorkspace(input: {
    workspaceId: string
    sourceType: Extract<SourceId, "imap">
  }): Promise<WorkspaceDataSource | null>
  findByIdForWorkspace(input: {
    workspaceId: string
    sourceId: string
  }): Promise<WorkspaceDataSource | null>
  connectImap(input: ConnectImapInput): Promise<ImapDataSource>
  updateImapConfig(input: UpdateImapConfigInput): Promise<ImapDataSource>
  disconnect(input: { workspaceId: string; sourceId: string }): Promise<void>
  requestSync(input: { workspaceId: string; sourceId: string }): Promise<void>
}

export type ImapConnectionTestInput = ImapConfig & {
  password: string
}

export type ImapConnectionTestResult = {
  folders: Array<{ path: string; messages: number | null }>
}

export type ImapConnectionTester = {
  test(input: ImapConnectionTestInput): Promise<ImapConnectionTestResult>
}
