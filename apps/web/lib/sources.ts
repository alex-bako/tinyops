export {
  CONNECTOR_DEFINITIONS,
  CONNECTOR_IDS as SOURCE_IDS,
  composeWorkspaceConnectorCatalog,
  getConnectorMetadata,
  listConnectorDefinitions,
} from "@/features/data-sources/connectors"

export type {
  ConnectorDefinition,
  ConnectorId as SourceId,
  ConnectorTypeCatalogItem,
  DataSource,
  DataSourceAuth,
  DataSourceGoogleFormsSettings,
  DataSourceHealth,
  DataSourceIcon,
  DataSourceImapSettings,
  DataSourceStat,
  DataSourceStatId,
  HomeSourceRow,
  WorkspaceDataSourceCatalogItem,
} from "@/features/data-sources/connectors"

import {
  availableSources as availableConnectorSources,
  composeWorkspaceConnectorCatalog,
  connectedSources as connectedConnectorSources,
  findSourceById as findConnectorSourceById,
  homeSourceRows as connectorHomeSourceRows,
  listConnectorDefinitions,
  sourceStatusLabel,
  type DataSource,
} from "@/features/data-sources/connectors"

export const SOURCES = composeWorkspaceConnectorCatalog([])

export function listSourceCatalogEntries(
  sources: DataSource[] = SOURCES
): DataSource[] {
  return [...sources]
}

export function listSourceDefinitions() {
  return listConnectorDefinitions()
}

export function connectedSources(sources: DataSource[] = SOURCES): DataSource[] {
  return connectedConnectorSources(sources)
}

export function availableSources(sources: DataSource[] = SOURCES): DataSource[] {
  return availableConnectorSources(sources)
}

export function findSourceById(
  id: string,
  sources: DataSource[] = SOURCES
): DataSource | null {
  return findConnectorSourceById(id, sources)
}

export function homeSourceRows(sources: DataSource[] = SOURCES) {
  return connectorHomeSourceRows(sources)
}

export { sourceStatusLabel }
