"use client"

import { SearchIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"
import { Kbd } from "@workspace/ui/components/kbd"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"

const FOCUS_EVENT = "tinyops:focus-home-search"

export function SidebarSearchTrigger() {
  const router = useRouter()
  const pathname = usePathname()

  const onActivate = () => {
    if (pathname === "/home") {
      window.dispatchEvent(new Event(FOCUS_EVENT))
    } else {
      router.push("/home")
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          aria-label="Search · ⌘K"
          onClick={onActivate}
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
