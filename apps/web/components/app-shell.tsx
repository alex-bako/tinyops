import * as React from "react"

import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar"

import { AppSidebar } from "@/components/app-sidebar"
import { AppTopbar } from "@/components/app-topbar"
import type { Crumb } from "@/lib/navigation"

export function AppShell({
  crumbs,
  userEmail,
  children,
}: {
  crumbs?: Crumb[]
  userEmail?: string | null
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar userEmail={userEmail} />
      <SidebarInset>
        <AppTopbar crumbs={crumbs} />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
