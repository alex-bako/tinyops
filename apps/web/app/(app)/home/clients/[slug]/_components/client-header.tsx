import { EyeOffIcon, PlusIcon, SendIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { ClientIdentityHeader } from "@/components/client-identity"
import type { ClientDetailHeaderView } from "../_view-model"
import { CopyEmailButton } from "./copy-email-button"

export function ClientHeader({
  header,
  viewTransitionName,
}: {
  header: ClientDetailHeaderView
  viewTransitionName?: string
}) {
  return (
    <div
      className={cn(
        "mb-8 flex items-start gap-[18px] border-b border-border pb-6"
      )}
    >
      <div
        className="flex min-w-0 flex-1 items-start gap-[18px]"
        style={viewTransitionName ? { viewTransitionName } : undefined}
      >
        <ClientIdentityHeader {...header} />
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm">
          <PlusIcon />
          Add note
        </Button>
        <Button variant="ghost" size="sm">
          <EyeOffIcon />
          Do not contact
        </Button>
        <CopyEmailButton email={header.email} />
        <Button variant="primary" size="sm">
          <SendIcon />
          Draft email
        </Button>
      </div>
    </div>
  )
}
