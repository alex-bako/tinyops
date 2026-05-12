import { ArrowRightIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

function MapRow({
  csv,
  prop,
  warn = false,
}: {
  csv: string
  prop: string
  warn?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-sm border border-border px-2.5 py-2",
        warn && "border-coral-500/30"
      )}
    >
      <code
        className={cn(
          "min-w-[140px] rounded-[3px] bg-[var(--tint-hover)] px-2 py-px font-mono text-[12px] text-foreground",
          warn && "bg-coral-500/15 text-coral-700"
        )}
      >
        {csv}
      </code>
      <ArrowRightIcon className="size-3 text-muted-foreground" />
      <span
        className={cn(
          "text-[13px] text-foreground",
          warn && "text-coral-700"
        )}
      >
        {prop}
      </span>
      <button
        type="button"
        className="ml-auto rounded-[3px] border border-[color:var(--rule-strong)] px-2 py-0.5 text-[12px] text-muted-foreground transition-colors hover:bg-[var(--tint-hover)] hover:text-foreground"
      >
        Change
      </button>
    </div>
  )
}

export { MapRow }
