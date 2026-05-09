import * as React from "react"

import { AppShell } from "@/components/app-shell"
import { readSupabaseAppProfileSession } from "@/lib/auth/profile"
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
  const session = await readSupabaseAppProfileSession(supabase)

  return <AppShell userEmail={session?.email}>{children}</AppShell>
}
