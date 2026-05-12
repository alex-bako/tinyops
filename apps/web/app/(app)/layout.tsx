import * as React from "react"
import { redirect } from "next/navigation"

import { AppShell } from "@/components/app-shell"
import { WorkspaceFeatureProvider } from "@/features/workspaces/context"
import { createWorkspaceRequestContext } from "@/features/data-sources/request-context"
import { loadWorkspaceSourceCatalogForWorkspace } from "@/features/data-sources/loaders"
import {
  createClientMemoryRepositoryFromContext,
  loadClientNavItems,
} from "@/features/clients/adapters/client-memory-loader"
import { ONBOARDING_PATH } from "@/app/onboarding/constants"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>
}

export async function AuthenticatedAppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const context = await createWorkspaceRequestContext()

  if (
    !context ||
    !context.session.profile?.onboardedAt ||
    !context.workspaceFeatureData.activeWorkspaceId
  ) {
    redirect(ONBOARDING_PATH)
  }

  const workspaceFeatureData = context.workspaceFeatureData
  const [clientNavItems, sourceCatalog] = await Promise.all([
    loadClientNavItems(createClientMemoryRepositoryFromContext(context)),
    loadWorkspaceSourceCatalogForWorkspace({
      workspace: context.activeWorkspace,
      store: context.dataSourceStore,
    }),
  ])
  const sourceNavItems = sourceCatalog.flatMap((source) =>
    source.kind === "data_source"
      ? [
          {
            sourceType: source.sourceType,
            sourceSlug: source.sourceSlug,
            title: source.title,
          },
        ]
      : []
  )

  return (
    <WorkspaceFeatureProvider data={workspaceFeatureData}>
      <AppShell
        userEmail={context.session.email}
        clientNavItems={clientNavItems}
        sourceNavItems={sourceNavItems}
      >
        {children}
      </AppShell>
    </WorkspaceFeatureProvider>
  )
}
