import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function KeyRow({
  value,
  className,
  children,
}: {
  value: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-sm border border-border bg-[var(--tint-hover)] py-1 pl-2.5 pr-1",
        className
      )}
    >
      <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12.5px] tracking-[0.02em] text-foreground">
        {value}
      </code>
      {children ? (
        <div className="flex items-center gap-1">{children}</div>
      ) : null}
    </div>
  )
}

export { KeyRow }
