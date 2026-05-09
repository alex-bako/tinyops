import type { Workspace } from "@/features/workspaces/types"
import { createDataSourceApplication } from "@/features/data-sources/application"
import { createImapFlowConnectionTester } from "@/features/data-sources/imap-connection-tester"
import { createWorkspaceRequestContext } from "@/features/data-sources/request-context"
import { composeWorkspaceSourceCatalog } from "@/features/data-sources/source-catalog"
import type { DataSourceStore } from "@/features/data-sources/types"
import type { AppProfileSession } from "@/lib/auth/profile"
import type { DataSource } from "@/lib/sources"

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
  const application = createDataSourceApplication({
    workspace,
    store,
    imapConnectionTester: createImapFlowConnectionTester(),
  })
  const sources = await application.listDataSources()
  return composeWorkspaceSourceCatalog(sources)
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
