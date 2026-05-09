import * as React from "react"

import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar"

import { AppSidebar } from "@/components/app-sidebar"
import { AppTopbar } from "@/components/app-topbar"
import type { ClientNavItem } from "@/lib/client-memory/repository"
import type { Crumb } from "@/lib/navigation"
import type { SourceNavItem } from "@/lib/source-catalog/repository"

export function AppShell({
  crumbs,
  userEmail,
  clientNavItems,
  sourceNavItems,
  children,
}: {
  crumbs?: Crumb[]
  userEmail?: string | null
  clientNavItems?: ClientNavItem[]
  sourceNavItems?: SourceNavItem[]
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar userEmail={userEmail} />
      <SidebarInset>
        <AppTopbar
          crumbs={crumbs}
          clientNavItems={clientNavItems}
          sourceNavItems={sourceNavItems}
        />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
