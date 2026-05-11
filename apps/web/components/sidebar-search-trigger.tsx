import { SearchIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Kbd } from "@workspace/ui/components/kbd"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"

export function SidebarSearchTrigger() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          aria-label="Search · ⌘K"
          className={cn(
            "h-7 gap-2 text-sidebar-foreground/55 hover:text-sidebar-foreground",
            "[&>svg]:text-sidebar-foreground/55"
          )}
        >
          <SearchIcon />
          <span className="text-[13px]">Search</span>
          <Kbd className="ml-auto border-none bg-transparent p-0 text-sidebar-foreground/35 group-data-[collapsible=icon]:hidden">
            ⌘K
          </Kbd>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
