import { LogOutIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { TonalAvatar } from "@workspace/ui/components/tonal-avatar"

export function SidebarUser({
  email,
}: {
  email?: string | null
}) {
  const displayEmail = email ?? "Signed in"
  const avatarName = email ?? "TinyOps"

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-1 py-1",
        "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
      )}
    >
      <TonalAvatar name={avatarName} size="md" tone="slate" />
      <div className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate text-[13px] font-medium text-sidebar-foreground">
          {displayEmail}
        </span>
        <span className="truncate text-[11.5px] text-sidebar-foreground/55">
          Sole practitioner
        </span>
      </div>
      <form action="/auth/sign-out" method="post">
        <Button
          type="submit"
          variant="tertiary"
          size="icon-sm"
          aria-label="Sign out"
          className={cn(
            "size-6 shrink-0 text-sidebar-foreground/55",
            "hover:bg-sidebar-accent hover:text-sidebar-foreground",
            "group-data-[collapsible=icon]:hidden",
            "[&>svg]:size-[15px]"
          )}
        >
          <LogOutIcon />
        </Button>
      </form>
    </div>
  )
}
