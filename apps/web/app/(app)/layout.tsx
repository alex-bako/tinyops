import * as React from "react"

import { AppShell } from "@/components/app-shell"
import { WorkspaceFeatureProvider } from "@/features/workspaces/context"
import { createWorkspaceRequestContext } from "@/features/data-sources/request-context"
import { loadWorkspaceSourceCatalogForWorkspace } from "@/features/data-sources/loaders"
import { loadClientNavItems } from "@/lib/client-memory/loaders"
import type { WorkspaceFeatureData } from "@/features/workspaces/types"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>
}

export async function AuthenticatedAppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [clientNavItems, context] = await Promise.all([
    loadClientNavItems(),
    createWorkspaceRequestContext(),
  ])
  const workspaceFeatureData =
    context?.workspaceFeatureData ?? EMPTY_WORKSPACE_FEATURE_DATA
  const sourceCatalog = context
    ? await loadWorkspaceSourceCatalogForWorkspace({
        workspace: context.activeWorkspace,
        store: context.dataSourceStore,
      })
    : []
  const sourceNavItems = sourceCatalog.map(({ id, title }) => ({ id, title }))

  return (
    <WorkspaceFeatureProvider data={workspaceFeatureData}>
      <AppShell
        userEmail={context?.session.email}
        clientNavItems={clientNavItems}
        sourceNavItems={sourceNavItems}
      >
        {children}
      </AppShell>
    </WorkspaceFeatureProvider>
  )
}

const EMPTY_WORKSPACE_FEATURE_DATA: WorkspaceFeatureData = {
  workspaces: [],
  joinableWorkspaces: [],
  usageByWorkspaceId: {},
  activeWorkspaceId: null,
}
