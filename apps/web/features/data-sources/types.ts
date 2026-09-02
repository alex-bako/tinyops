import type { SourceId } from "@/lib/sources"
import type {
  GoogleFormsApiForm,
  GoogleFormsApiResponse,
  GoogleFormsApiSourceConfig,
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
  /** Live API mode only: question answered with the client email. */
  identityQuestionId?: string | null
  latestUpload: GoogleFormsUpload | null
  sync: DataSourceSyncState
  syncRuns?: DataSourceSyncRun[]
  createdAt: string
  updatedAt: string
}

export type WorkspaceDataSource = ImapDataSource | GoogleFormsDataSource

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

export type ConnectGoogleFormsApiInput = {
  workspaceId: string
  source: GoogleFormsApiSourceConfig
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
  connectGoogleFormsApi(
    input: ConnectGoogleFormsApiInput
  ): Promise<GoogleFormsDataSource>
}

/** Read-only Google Forms API access on behalf of the TinyOps service account. */
export type GoogleFormsApiPort = {
  serviceAccountEmail: string
  getForm(formId: string): Promise<GoogleFormsApiForm>
  listResponses(input: {
    formId: string
    filter?: string
    pageSize?: number
    pageToken?: string
  }): Promise<{
    responses: GoogleFormsApiResponse[]
    nextPageToken: string | null
  }>
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
