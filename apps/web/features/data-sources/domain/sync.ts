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

/**
 * Periodically re-queues connected, idle connectors so steady-state incremental
 * sync runs on the cron cadence. In-flight (queued/running/error) sources are
 * left untouched, so it is safe to call on every tick.
 */
export type DataSourceSyncScheduler = {
  enqueueDueSyncs(): Promise<{ queued: number }>
}

export type SyncFailureCode =
  | "source_not_found"
  | "invalid_imap_config"
  | "secret_read_failed"
  | "imap_connection_failed"
  | "google_forms_not_configured"
  | "google_forms_access_failed"
  | "invalid_stripe_config"
  | "stripe_access_failed"
  | "stripe_api_failed"
  | "invalid_mailerlite_config"
  | "mailerlite_access_failed"
  | "mailerlite_api_failed"
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
    value === "google_forms_not_configured" ||
    value === "google_forms_access_failed" ||
    value === "invalid_stripe_config" ||
    value === "stripe_access_failed" ||
    value === "stripe_api_failed" ||
    value === "invalid_mailerlite_config" ||
    value === "mailerlite_access_failed" ||
    value === "mailerlite_api_failed" ||
    value === "ingestion_failed" ||
    value === "sync_failed"
  )
}

export function syncFailureMessage(code: SyncFailureCode) {
  if (code === "source_not_found") return "Source not found"
  if (code === "invalid_imap_config") return "Invalid IMAP configuration"
  if (code === "secret_read_failed") return "Could not read stored credential"
  if (code === "imap_connection_failed") return "IMAP connection failed"
  if (code === "google_forms_not_configured") {
    return "Google Forms live sync is not configured"
  }
  if (code === "google_forms_access_failed") {
    return "Google Forms access failed. Share the form with the TinyOps service account"
  }
  if (code === "invalid_stripe_config") return "Invalid Stripe configuration"
  if (code === "stripe_access_failed") {
    return "Stripe rejected the API key. Reconnect with a valid secret key"
  }
  if (code === "stripe_api_failed") return "Stripe API request failed"
  if (code === "invalid_mailerlite_config") return "Invalid MailerLite configuration"
  if (code === "mailerlite_access_failed") {
    return "MailerLite rejected the API key. Reconnect with a valid key"
  }
  if (code === "mailerlite_api_failed") return "MailerLite API request failed"
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
