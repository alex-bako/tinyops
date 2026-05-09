import { CopyIcon, EyeOffIcon, PlusIcon, SendIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { ClientIdentityHeader } from "@/components/client-identity"
import type { ClientDetailHeaderView } from "../_view-model"

export function ClientHeader({ header }: { header: ClientDetailHeaderView }) {
  return (
    <div
      className={cn(
        "mb-8 flex items-start gap-[18px] border-b border-border pb-6"
      )}
    >
      <ClientIdentityHeader {...header} />
      <div className="flex flex-shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm">
          <PlusIcon />
          Add note
        </Button>
        <Button variant="ghost" size="sm">
          <EyeOffIcon />
          Do not contact
        </Button>
        <Button variant="secondary" size="sm">
          <CopyIcon />
          Copy email
        </Button>
        <Button variant="primary" size="sm">
          <SendIcon />
          Draft email
        </Button>
      </div>
    </div>
  )
}
