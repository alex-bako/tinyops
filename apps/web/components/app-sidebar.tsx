"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PlusIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

import { SidebarSearchTrigger } from "@/components/sidebar-search-trigger"
import { SidebarUser } from "@/components/sidebar-user"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import {
  NAV_GROUPS,
  flattenNavItems,
  pickActiveNavItemId,
  type NavItem,
} from "@/lib/navigation"

function NavRow({
  item,
  activeId,
}: {
  item: NavItem
  activeId: string | null
}) {
  const Icon = item.icon
  const active = activeId === item.id

  const content = (
    <>
      <Icon />
      <span>{item.label}</span>
      {item.count != null && (
        <span
          className={cn(
            "ml-auto font-normal text-sidebar-foreground/40 tabular-nums",
            "group-data-[active=true]/menu-button:text-sidebar-foreground/65",
            "group-hover/menu-button:text-sidebar-foreground/55",
            "group-data-[collapsible=icon]:hidden"
          )}
        >
          {item.count}
        </span>
      )}
    </>
  )

  return (
    <SidebarMenuItem>
      {item.href ? (
        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
          <Link href={item.href}>{content}</Link>
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton isActive={active} tooltip={item.label}>
          {content}
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  )
}

export function AppSidebar({
  userEmail,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  userEmail?: string | null
}) {
  const pathname = usePathname() ?? ""
  const activeId = pickActiveNavItemId(flattenNavItems(NAV_GROUPS), pathname)

  return (
    <Sidebar variant="sidebar" collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher />
        <SidebarSearchTrigger />
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.id}>
            {group.label ? (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            ) : null}
            {group.id === "pinned" ? (
              <SidebarGroupAction
                aria-label="Pin a new view"
                className="opacity-0 transition-opacity duration-(--dur-fast) group-hover/sidebar-group:opacity-100 focus-visible:opacity-100"
              >
                <PlusIcon />
              </SidebarGroupAction>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavRow key={item.id} item={item} activeId={activeId} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarUser email={userEmail} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
