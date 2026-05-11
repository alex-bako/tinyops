import {
  SOURCES,
  availableSources,
  connectedSources,
  sourceStatusLabel,
  type DataSource,
  type DataSourceIcon,
  type DataSourceStat,
} from "@/lib/sources"

type SourcesPageRowAction = "sync" | "connect" | "manage"

type SourcesPageRow = {
  id: string
  sourceRowId?: string
  sourceRowIds: string[]
  icon: DataSourceIcon
  title: string
  sub: string
  connected: boolean
  isNew: boolean
  stats: DataSourceStat[]
  action: SourcesPageRowAction
  href: string
  primaryLabel: string
  configureLabel: string
  statusLabel: string
}

type SourcesPageSection = {
  count: string
  rows: SourcesPageRow[]
}

type SourcesPageView = {
  connected: SourcesPageSection
  available: SourcesPageSection
}

function sourcePageRow(source: DataSource): SourcesPageRow {
  const sourceRowId = singleSourceRowId(source.sourceRowIds)
  const action = source.connected
    ? sourceRowId
      ? "sync"
      : "manage"
    : "connect"
  return {
    id: source.id,
    ...(sourceRowId ? { sourceRowId } : {}),
    sourceRowIds: source.sourceRowIds,
    icon: source.icon,
    title: source.title,
    sub: source.sub,
    connected: source.connected,
    isNew: source.isNew ?? false,
    stats: source.stats,
    action,
    href: `/home/sources/${source.id}`,
    primaryLabel: action === "sync" ? "Sync" : action === "manage" ? "Manage" : "Connect",
    configureLabel: `Configure ${source.title}`,
    statusLabel: sourceStatusLabel(source),
  }
}

function singleSourceRowId(sourceRowIds: string[]) {
  return sourceRowIds.length === 1 ? sourceRowIds[0] : undefined
}

function createSourcesPageView(
  sources: DataSource[] = SOURCES
): SourcesPageView {
  const connectedRows = connectedSources(sources).map(sourcePageRow)
  const availableRows = availableSources(sources).map(sourcePageRow)

  return {
    connected: {
      count: String(connectedRows.length),
      rows: connectedRows,
    },
    available: {
      count: String(availableRows.length),
      rows: availableRows,
    },
  }
}

export { createSourcesPageView }
export type { SourcesPageRow, SourcesPageSection, SourcesPageView }
