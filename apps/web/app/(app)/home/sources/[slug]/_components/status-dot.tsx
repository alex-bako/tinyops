import { cn } from "@workspace/ui/lib/utils"

import type { SourceStatus } from "../_view-model"

const DOT_TONE: Record<SourceStatus["variant"], string> = {
  ok: "bg-mint-500 ring-mint-500/20",
  off: "bg-muted-foreground/40 ring-transparent",
  warn: "bg-coral-500 ring-coral-500/20",
}

function StatusDot({
  status,
  className,
}: {
  status: SourceStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap text-[12.5px] text-muted-foreground",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-[7px] shrink-0 rounded-full ring-[3px]",
          DOT_TONE[status.variant]
        )}
      />
      <span>{status.label}</span>
    </span>
  )
}

export { StatusDot }
