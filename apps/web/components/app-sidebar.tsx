import * as React from "react"
import {
  CircleSlashIcon,
  HashIcon,
  HomeIcon,
  ListTodoIcon,
  MessageSquareIcon,
  PlugZapIcon,
  PlusIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

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

type NavItem = {
  id: string
  label: string
  icon: LucideIcon
  count?: number
  isActive?: boolean
}

const NAV_PRIMARY: NavItem[] = [
  { id: "home", label: "Home", icon: HomeIcon, isActive: true },
  { id: "clients", label: "Clients", icon: UsersIcon, count: 142 },
  { id: "tasks", label: "Tasks", icon: ListTodoIcon, count: 3 },
  { id: "sources", label: "Data sources", icon: PlugZapIcon },
]

const NAV_PINNED: NavItem[] = [
  { id: "march", label: "March cohort", icon: HashIcon, count: 47 },
  {
    id: "feedback",
    label: "Feedback queue",
    icon: MessageSquareIcon,
    count: 12,
  },
  { id: "dnc", label: "Do not contact", icon: CircleSlashIcon, count: 3 },
]

const NAV_WORKSPACE: NavItem[] = [
  { id: "settings", label: "Settings", icon: Settings2Icon },
]

function NavRow({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={item.isActive} tooltip={item.label}>
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
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="sidebar" collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher />
        <SidebarSearchTrigger />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_PRIMARY.map((item) => (
                <NavRow key={item.id} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Pinned views</SidebarGroupLabel>
          <SidebarGroupAction
            aria-label="Pin a new view"
            className="opacity-0 transition-opacity duration-(--dur-fast) group-hover/sidebar-group:opacity-100 focus-visible:opacity-100"
          >
            <PlusIcon />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_PINNED.map((item) => (
                <NavRow key={item.id} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_WORKSPACE.map((item) => (
                <NavRow key={item.id} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
