import {
  type DataSource,
  type DataSourceAuth,
  type DataSourceIcon,
  type SourceId,
} from "@/lib/sources"
import type {
  SourceActivityRow,
  SourceUiRegistryEntry,
} from "./source-registry"

type SourceStatus = {
  variant: "ok" | "off" | "warn"
  label: string
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
  sourceId: SourceId
  auth: DataSourceAuth
}

type SourceDetailConfig = {
  sourceId: SourceId
}

type SourceDetailActions = {
  canDisconnect: boolean
  canSync: boolean
}

type SourceDetailView = {
  id: SourceId
  connected: boolean
  connection: SourceDetailConnection
  config: SourceDetailConfig
  actions: SourceDetailActions
  header: SourceDetailHeader
  activity: SourceActivityRow[]
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
    return { variant: "warn", label: "Connection error" }
  }
  return {
    variant: "ok",
    label: source.lastSync
      ? `Connected · synced ${source.lastSync}`
      : "Connected",
  }
}

function createSourceDetailView(
  source: DataSource,
  sourceUi: Pick<SourceUiRegistryEntry, "activity" | "logoClassName">
): SourceDetailView {
  const connected = source.connected
  return {
    id: source.id,
    connected,
    connection: {
      sourceId: source.id,
      auth: source.auth,
    },
    config: {
      sourceId: source.id,
    },
    actions: {
      canDisconnect: connected,
      canSync: connected,
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
  }
}

export { createSourceDetailView }
export type {
  SourceActivityRow,
  SourceDetailActions,
  SourceDetailConfig,
  SourceDetailConnection,
  SourceDetailHeader,
  SourceDetailView,
  SourceStatus,
}
