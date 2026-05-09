"use client"

import * as React from "react"
import { CheckIcon, MinusIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

function PermissionPill({
  on,
  locked = false,
  onToggle,
  className,
  title,
}: {
  on: boolean
  locked?: boolean
  onToggle?: () => void
  className?: string
  title?: string
}) {
  return (
    <button
      type="button"
      data-slot="permission-pill"
      data-state={on ? "on" : "off"}
      data-locked={locked || undefined}
      disabled={locked}
      onClick={onToggle}
      title={
        title ??
        (locked ? "Locked" : on ? "Allowed — click to revoke" : "Not allowed — click to grant")
      }
      aria-pressed={on}
      className={cn(
        "inline-flex h-[22px] w-[26px] items-center justify-center rounded-xs transition-colors duration-(--dur-fast)",
        on
          ? "bg-cobalt-500/15 text-cobalt-700 hover:bg-cobalt-500/25"
          : "bg-[rgba(15,23,42,0.07)] text-muted-foreground hover:bg-[rgba(15,23,42,0.12)]",
        locked && "cursor-not-allowed opacity-55 hover:bg-cobalt-500/15",
        className
      )}
    >
      {on ? <CheckIcon className="size-3" /> : <MinusIcon className="size-3" />}
    </button>
  )
}

export { PermissionPill }
