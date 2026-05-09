import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import type { AvatarTone } from "@workspace/ui/components/tonal-avatar"

const toneClasses: Record<AvatarTone, string> = {
  cobalt: "bg-cobalt-500/12 text-cobalt-700",
  mint: "bg-mint-500/12 text-mint-700",
  citron: "bg-citron-300/40 text-citron-700",
  coral: "bg-coral-500/15 text-coral-700",
  slate: "bg-[rgba(15,23,42,0.07)] text-muted-foreground",
}

function RoleChip({
  label,
  tone,
  you = false,
  className,
}: {
  label: string
  tone: AvatarTone
  you?: boolean
  className?: string
}) {
  return (
    <span
      data-slot="role-chip"
      data-tone={tone}
      className={cn(
        "inline-flex h-[18px] items-center whitespace-nowrap rounded-xs px-1.5 text-[11px] font-medium tracking-[-0.005em]",
        toneClasses[tone],
        className
      )}
    >
      {label}
      {you ? " · you" : ""}
    </span>
  )
}

export { RoleChip }
