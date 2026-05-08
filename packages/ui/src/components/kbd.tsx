import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex items-center justify-center rounded-xs border border-input px-1.5 py-px font-mono text-[11px] leading-none text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Kbd }
