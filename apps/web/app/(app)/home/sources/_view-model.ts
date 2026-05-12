import {
  SOURCES,
  availableSources,
  connectedSources,
  sourceStatusLabel,
  type DataSource,
  type DataSourceIcon,
  type DataSourceStat,
} from "@/lib/sources"

type SourcesPageRowAction = "sync" | "connect"

type SourcesPageRow = {
  rowKey: string
  id: string
  sourceId?: string
  sourceType: string
  sourceSlug?: string
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
  const action = source.kind === "data_source" ? "sync" : "connect"
  const href = source.kind === "data_source"
    ? `/home/sources/${source.sourceType}/${source.sourceSlug}`
    : `/home/sources/${source.id}/new`
  return {
    rowKey: source.kind === "data_source" ? source.sourceId : source.id,
    id: source.id,
    sourceType: source.kind === "data_source" ? source.sourceType : source.id,
    ...(source.kind === "data_source"
      ? { sourceId: source.sourceId, sourceSlug: source.sourceSlug }
      : {}),
    icon: source.icon,
    title: source.title,
    sub: source.sub,
    connected: source.connected,
    isNew: source.isNew ?? false,
    stats: source.stats,
    action,
    href,
    primaryLabel: action === "sync" ? "Sync" : "Connect",
    configureLabel: `Configure ${source.title}`,
    statusLabel: sourceStatusLabel(source),
  }
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
