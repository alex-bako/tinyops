import { SettingsIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { TonalAvatar } from "@workspace/ui/components/tonal-avatar"

export function SidebarUser({
  name = "Jamie Park",
  role = "Sole practitioner",
}: {
  name?: string
  role?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-1 py-1",
        "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
      )}
    >
      <TonalAvatar name={name} size="md" tone="slate" />
      <div className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate text-[13px] font-medium text-sidebar-foreground">
          {name}
        </span>
        <span className="truncate text-[11.5px] text-sidebar-foreground/55">
          {role}
        </span>
      </div>
      <button
        type="button"
        aria-label="Account settings"
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-sidebar-foreground/55",
          "transition-colors duration-(--dur-fast) ease-(--ease-out)",
          "hover:bg-sidebar-accent hover:text-sidebar-foreground",
          "group-data-[collapsible=icon]:hidden",
          "[&>svg]:size-[15px]"
        )}
      >
        <SettingsIcon />
      </button>
    </div>
  )
}
