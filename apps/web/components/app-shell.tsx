import * as React from "react"

import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar"

import { AppSidebar } from "@/components/app-sidebar"
import { AppTopbar } from "@/components/app-topbar"
import type { ClientNavItem } from "@/lib/client-memory/repository"
import type { Crumb } from "@/lib/navigation"

export function AppShell({
  crumbs,
  userEmail,
  clientNavItems,
  children,
}: {
  crumbs?: Crumb[]
  userEmail?: string | null
  clientNavItems?: ClientNavItem[]
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar userEmail={userEmail} />
      <SidebarInset>
        <AppTopbar crumbs={crumbs} clientNavItems={clientNavItems} />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
