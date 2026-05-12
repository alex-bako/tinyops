import {
  composeWorkspaceConnectorCatalog,
  type ConnectorDefinition,
  type DataSource,
} from "@/features/data-sources/connectors"
import type { WorkspaceDataSource } from "@/features/data-sources/types"

export function composeWorkspaceSourceCatalog(
  workspaceSources: WorkspaceDataSource[],
  catalog?: ConnectorDefinition[]
): DataSource[] {
  return composeWorkspaceConnectorCatalog(workspaceSources, catalog)
}
