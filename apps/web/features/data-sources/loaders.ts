import type { Workspace } from "@/features/workspaces/types"
import { createDataSourceQueryApplication } from "@/features/data-sources/application"
import { createWorkspaceRequestContext } from "@/features/data-sources/request-context"
import { composeWorkspaceSourceCatalog } from "@/features/data-sources/source-catalog"
import type { DataSourceStore } from "@/features/data-sources/types"
import type { AppProfileSession } from "@/lib/auth/profile"
import { findSourceById, type DataSource } from "@/lib/sources"

export async function loadWorkspaceSourceCatalog(): Promise<DataSource[]> {
  const context = await createDataSourceServerContext()
  if (!context) return composeWorkspaceSourceCatalog([])

  return loadWorkspaceSourceCatalogForWorkspace(context)
}

export async function loadWorkspaceSourceCatalogForWorkspace({
  workspace,
  store,
}: {
  workspace: Pick<Workspace, "id" | "role">
  store: DataSourceStore
}): Promise<DataSource[]> {
  const application = createDataSourceQueryApplication({
    workspace,
    reader: store,
  })
  const sources = await application.listDataSources()
  return composeWorkspaceSourceCatalog(sources)
}

export async function loadWorkspaceSourceBySlug({
  sourceType,
  sourceSlug,
}: {
  sourceType: string
  sourceSlug: string
}): Promise<DataSource | null> {
  const context = await createDataSourceServerContext()
  if (!context) return null

  const application = createDataSourceQueryApplication({
    workspace: context.workspace,
    reader: context.store,
  })
  const source = await application.findDataSourceBySlug(sourceType, sourceSlug)
  if (!source) return null

  return (
    composeWorkspaceSourceCatalog([source]).find(
      (candidate) =>
        candidate.kind === "data_source" && candidate.sourceId === source.id
    ) ?? null
  )
}

export function loadConnectorDefinition(sourceType: string): DataSource | null {
  return findSourceById(sourceType)
}

export async function createDataSourceServerContext() {
  const context = await createWorkspaceRequestContext()
  if (!context) return null

  return {
    session: context.session,
    workspace: context.activeWorkspace,
    store: context.dataSourceStore,
  } satisfies {
    session: AppProfileSession
    workspace: Workspace
    store: DataSourceStore
  }
}
