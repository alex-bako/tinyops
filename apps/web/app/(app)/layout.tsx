import * as React from "react"

import { AppShell } from "@/components/app-shell"
import { WorkspaceFeatureProvider } from "@/features/workspaces/context"
import { createCookieActiveWorkspaceStore } from "@/features/workspaces/active-workspace-cookie"
import { loadWorkspaceFeatureDataForSession } from "@/features/workspaces/loaders"
import { createSupabaseWorkspaceStore } from "@/features/workspaces/supabase-store"
import { loadClientNavItems } from "@/lib/client-memory/loaders"
import { readSupabaseAppProfileSession } from "@/lib/auth/profile"
import { loadSourceNavItems } from "@/lib/source-catalog/loaders"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>
}

export async function AuthenticatedAppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const session = await readSupabaseAppProfileSession(supabase)
  const workspaceStore = createSupabaseWorkspaceStore({
    client: supabase,
    actorUserId: session?.user.id ?? "",
  })
  const activeWorkspaceStore = createCookieActiveWorkspaceStore()
  const [clientNavItems, sourceNavItems, activeWorkspaceId] = await Promise.all(
    [loadClientNavItems(), loadSourceNavItems(), activeWorkspaceStore.read()]
  )
  const workspaceFeatureData = await loadWorkspaceFeatureDataForSession({
    session,
    store: workspaceStore,
    activeWorkspaceId,
  })

  return (
    <WorkspaceFeatureProvider data={workspaceFeatureData}>
      <AppShell
        userEmail={session?.email}
        clientNavItems={clientNavItems}
        sourceNavItems={sourceNavItems}
      >
        {children}
      </AppShell>
    </WorkspaceFeatureProvider>
  )
}
