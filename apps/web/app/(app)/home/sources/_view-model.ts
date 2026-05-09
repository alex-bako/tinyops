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
  id: string
  icon: DataSourceIcon
  title: string
  sub: string
  connected: boolean
  stats: DataSourceStat[]
  action: SourcesPageRowAction
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
  return {
    id: source.id,
    icon: source.icon,
    title: source.title,
    sub: source.sub,
    connected: source.connected,
    stats: source.stats,
    action: source.connected ? "sync" : "connect",
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
