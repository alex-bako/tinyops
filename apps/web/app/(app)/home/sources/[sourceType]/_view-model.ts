import {
  type DataSource,
  type DataSourceAuth,
  type DataSourceIcon,
  type SourceId,
} from "@/lib/sources"
import type { DataSourceSyncRun } from "@/features/data-sources/types"
import type {
  SourceActivityRow,
  SourceUiRegistryEntry,
} from "./source-registry"

type SourceStatus = {
  variant: "ok" | "off" | "warn"
  label: string
  detail?: string
}

type SourceDetailHeader = {
  id: SourceId
  icon: DataSourceIcon
  logoClassName: string
  title: string
  subtitle: string
  category: string
  isNew: boolean
  status: SourceStatus
}

type SourceDetailConnection = {
  sourceType: SourceId
  auth: DataSourceAuth
}

type SourceDetailConfig = {
  sourceType: SourceId
}

type SourceDetailActions = {
  canDisconnect: boolean
  canSync: boolean
  sourceId?: string
}

type SourceSyncAttempt = {
  trigger: string
  status: "running" | "succeeded" | "failed"
  startedAt: string
  finishedAt: string | null
  label: string
  detail?: string
}

type SourceDetailView = {
  id: SourceId
  connected: boolean
  connection: SourceDetailConnection
  config: SourceDetailConfig
  actions: SourceDetailActions
  header: SourceDetailHeader
  activity: SourceActivityRow[]
  syncAttempts: SourceSyncAttempt[]
}

function deriveStatus(source: DataSource): SourceStatus {
  if (!source.connected) return { variant: "off", label: "Not connected" }
  if (source.health === "stale") {
    return {
      variant: "warn",
      label: source.lastSync
        ? `Stale · last synced ${source.lastSync}`
        : "Stale",
    }
  }
  if (source.health === "error") {
    const detail =
      source.imap?.lastError ??
      source.forms?.connections.find((connection) => connection.lastError)
        ?.lastError ??
      source.stripe?.lastError ??
      undefined
    return {
      variant: "warn",
      label: isConnectionFailure(detail) ? "Connection error" : "Sync error",
      ...(detail ? { detail } : {}),
    }
  }
  return {
    variant: "ok",
    label: source.lastSync === "queued"
      ? "Connected · queued"
      : source.lastSync
      ? `Connected · synced ${source.lastSync}`
      : "Connected",
  }
}

function isConnectionFailure(lastError: string | undefined) {
  return /^(imap_connection_failed|google_forms_access_failed|google_forms_not_configured|stripe_access_failed|invalid_stripe_config)/.test(
    lastError ?? ""
  )
}

function createSourceDetailView(
  source: DataSource,
  sourceUi: Pick<SourceUiRegistryEntry, "activity" | "logoClassName">
): SourceDetailView {
  const connected = source.kind === "data_source"
  return {
    id: source.id,
    connected,
    connection: {
      sourceType: source.id,
      auth: source.auth,
    },
    config: {
      sourceType: source.id,
    },
    actions: {
      canDisconnect: connected,
      canSync: connected,
      ...(connected ? { sourceId: source.sourceId } : {}),
    },
    header: {
      id: source.id,
      icon: source.icon,
      logoClassName: sourceUi.logoClassName,
      title: source.title,
      subtitle: source.sub,
      category: source.category,
      isNew: source.isNew ?? false,
      status: deriveStatus(source),
    },
    activity: sourceUi.activity,
    syncAttempts: syncAttempts(source),
  }
}

function syncAttempts(source: DataSource): SourceSyncAttempt[] {
  if (source.kind !== "data_source") return []
  return [
    ...(source.imap?.syncRuns ?? []),
    ...(source.stripe?.syncRuns ?? []),
    ...(source.forms?.connections.flatMap((connection) => connection.syncRuns ?? []) ??
      []),
  ]
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    .slice(0, 5)
    .map((run) => ({
      trigger: run.trigger,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      label: syncAttemptLabel(run.status),
      detail: syncAttemptDetail(run),
    }))
}

function syncAttemptLabel(status: SourceSyncAttempt["status"]) {
  if (status === "succeeded") return "Succeeded"
  if (status === "failed") return "Failed"
  return "Running"
}

function syncAttemptDetail(run: DataSourceSyncRun) {
  if (run.status === "failed") {
    return [run.errorCode, run.errorMessage].filter(Boolean).join(": ")
  }

  if (run.status === "succeeded") {
    const diagnosticDetail = syncDiagnosticDetail(run.diagnostics)
    if (diagnosticDetail) return diagnosticDetail

    const clients = numberCount(run.persistedCounts?.clients)
    const rawRecords = numberCount(run.persistedCounts?.rawRecords)
    const timelineEvents = numberCount(run.persistedCounts?.timelineEvents)
    return `${clients} ${plural("client", clients)}, ${rawRecords} ${plural(
      "record",
      rawRecords
    )}, ${timelineEvents} ${plural("event", timelineEvents)}`
  }

  return undefined
}

function syncDiagnosticDetail(diagnostics: Record<string, unknown> | null | undefined) {
  if (!diagnostics) return null
  const folders = Array.isArray(diagnostics.folders)
    ? diagnostics.folders.filter(isRecord)
    : []
  const scanned = folders.reduce(
    (total, folder) => total + numberCount(folder.searched),
    0
  )
  if (scanned === 0) return null

  const skipped = folders.reduce(
    (total, folder) => total + numberCount(folder.skipped),
    0
  )
  const ingestion = isRecord(diagnostics.ingestion) ? diagnostics.ingestion : null
  const imported =
    numberCount(ingestion?.attempted) ||
    folders.reduce((total, folder) => total + numberCount(folder.accepted), 0)

  return `${imported} ${plural("import", imported)} from ${scanned} scanned, ${skipped} ${plural(
    "skipped",
    skipped
  )}`
}

function numberCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function plural(label: string, count: number) {
  if (label === "import") return count === 1 ? "imported" : "imported"
  if (label === "skipped") return "skipped"
  return count === 1 ? label : `${label}s`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export { createSourceDetailView }
export type {
  SourceActivityRow,
  SourceDetailActions,
  SourceDetailConfig,
  SourceDetailConnection,
  SourceDetailHeader,
  SourceDetailView,
  SourceSyncAttempt,
  SourceStatus,
}
