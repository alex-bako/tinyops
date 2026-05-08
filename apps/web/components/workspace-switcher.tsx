import { ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"

export function WorkspaceSwitcher({
  name = "Jamie's TinyOps",
}: {
  name?: string
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="default"
          aria-label={`${name} workspace`}
          className={cn(
            "h-9 gap-2.5 px-2 [&>svg:first-child]:size-[22px] [&>svg:first-child]:shrink-0",
            "mb-4 [&>svg:last-child]:size-3.5 [&>svg:last-child]:text-sidebar-foreground/45"
          )}
        >
          <svg viewBox="0 0 44 44" fill="none" aria-hidden>
            <rect x="2" y="2" width="40" height="40" rx="8" fill="#2563EB" />
            <circle cx="32" cy="11" r="6" fill="#BEF264" />
          </svg>
          <span className="truncate text-[15px] font-semibold tracking-[-0.02em] text-sidebar-foreground">
            {name}
          </span>
          <ChevronsUpDownIcon className="ml-auto" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
