import {
  composeWorkspaceConnectorCatalog,
  type DataSource,
} from "@/features/data-sources/connectors"
import type { WorkspaceDataSource } from "@/features/data-sources/types"

export function composeWorkspaceSourceCatalog(
  workspaceSources: WorkspaceDataSource[],
  catalog?: DataSource[]
): DataSource[] {
  return composeWorkspaceConnectorCatalog(workspaceSources, catalog)
}
