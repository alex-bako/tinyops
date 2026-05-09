import * as React from "react"

import { AppShell } from "@/components/app-shell"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>
}

async function AuthenticatedAppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <AppShell userEmail={user?.email}>{children}</AppShell>
}
