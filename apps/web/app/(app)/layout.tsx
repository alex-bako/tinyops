import * as React from "react"

import { AppShell } from "@/components/app-shell"
import { WorkspaceFeatureProvider } from "@/features/workspaces/context"
import { loadWorkspaceFeatureData } from "@/features/workspaces/loaders"
import { loadClientNavItems } from "@/lib/client-memory/loaders"
import { readSupabaseAppProfileSession } from "@/lib/auth/profile"
import { loadSourceNavItems } from "@/lib/source-catalog/loaders"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>
}

export async function AuthenticatedAppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const [session, clientNavItems, sourceNavItems, workspaceFeatureData] =
    await Promise.all([
      readSupabaseAppProfileSession(supabase),
      loadClientNavItems(),
      loadSourceNavItems(),
      loadWorkspaceFeatureData(),
    ])

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
