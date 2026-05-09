"use client"

import * as React from "react"
import { CheckSquareIcon, SquareIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

function FormsListItem({
  name,
  meta,
  defaultChecked = false,
  muted = false,
}: {
  name: React.ReactNode
  meta?: React.ReactNode
  defaultChecked?: boolean
  muted?: boolean
}) {
  const [checked, setChecked] = React.useState(defaultChecked)
  const Icon = checked ? CheckSquareIcon : SquareIcon
  return (
    <button
      type="button"
      onClick={() => setChecked((prev) => !prev)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--tint-hover)]",
        muted && "opacity-55"
      )}
      aria-pressed={checked}
    >
      <Icon
        className={cn(
          "size-3.5 shrink-0",
          checked ? "text-cobalt-500" : "text-muted-foreground"
        )}
      />
      <span className="flex-1 text-[13px] font-medium text-foreground">
        {name}
      </span>
      {meta ? (
        <span className="font-mono text-[11px] text-muted-foreground">
          {meta}
        </span>
      ) : null}
    </button>
  )
}

export { FormsListItem }
