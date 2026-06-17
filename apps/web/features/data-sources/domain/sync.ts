import type {
  PersistedConnectorRecords,
  ConnectorSourceType,
} from "@/features/clients/application/connector-ingestion"
import type { Json } from "@/lib/database.types"

export type DataSourceSyncJob = {
  sourceId: string
  workspaceId: string
  sourceType: ConnectorSourceType
  leaseToken: string
}

export type DataSourceSyncTrigger = "immediate" | "cron" | (string & {})

export type DataSourceSyncJobStore = {
  claimNext(input: {
    workerId: string
    leaseSeconds: number
  }): Promise<DataSourceSyncJob | null>
  complete(input: {
    sourceId: string
    leaseToken: string
    cursor?: Json
    hasMore: boolean
  }): Promise<void>
  fail(input: { sourceId: string; leaseToken: string; error: string }): Promise<void>
}

export type SyncFailureCode =
  | "source_not_found"
  | "invalid_imap_config"
  | "secret_read_failed"
  | "imap_connection_failed"
  | "gmail_auth_revoked"
  | "gmail_api_error"
  | "ingestion_failed"
  | "sync_failed"

export type SyncFailure = {
  code: SyncFailureCode
  message: string
  sourceId?: string
  workspaceId?: string
  cause?: unknown
}

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export type DataSourceSyncRunRecorder = {
  start(input: {
    sourceId: string
    workspaceId: string
    trigger: DataSourceSyncTrigger
    workerId: string
  }): Promise<{ runId: string | null }>
  succeed(input: {
    runId: string | null
    sourceId: string
    workspaceId: string
    persistedCounts: PersistedConnectorRecords
    cursor?: Json | null
    diagnostics?: Json | null
  }): Promise<void>
  fail(input: {
    runId: string | null
    sourceId: string
    workspaceId: string
    failure: SyncFailure
  }): Promise<void>
}

export function isSyncFailureCode(value: string): value is SyncFailureCode {
  return (
    value === "source_not_found" ||
    value === "invalid_imap_config" ||
    value === "secret_read_failed" ||
    value === "imap_connection_failed" ||
    value === "gmail_auth_revoked" ||
    value === "gmail_api_error" ||
    value === "ingestion_failed" ||
    value === "sync_failed"
  )
}

export function syncFailureMessage(code: SyncFailureCode) {
  if (code === "source_not_found") return "Source not found"
  if (code === "invalid_imap_config") return "Invalid IMAP configuration"
  if (code === "secret_read_failed") return "Could not read IMAP password"
  if (code === "imap_connection_failed") return "IMAP connection failed"
  if (code === "gmail_auth_revoked")
    return "Gmail access was revoked — reconnect the mailbox"
  if (code === "gmail_api_error") return "Gmail API request failed"
  if (code === "ingestion_failed") return "Could not persist synced records"
  return "Sync failed"
}

export function serializeSyncFailure(failure: SyncFailure) {
  return `${failure.code}: ${failure.message}`
}

export function safeSyncFailureCauseMessage(cause: unknown) {
  const message =
    cause instanceof Error
      ? cause.message
      : hasMessage(cause)
        ? cause.message
        : ""
  if (!message || /password|token|api[_ -]?key|decrypted_secret/i.test(message)) {
    return null
  }
  return message.slice(0, 500)
}

export function syncFailure(
  code: SyncFailureCode,
  context: { sourceId: string; workspaceId: string },
  cause?: unknown
): SyncFailure {
  return {
    code,
    message: syncFailureMessage(code),
    sourceId: context.sourceId,
    workspaceId: context.workspaceId,
    ...(cause === undefined ? {} : { cause }),
  }
}

function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  )
}
