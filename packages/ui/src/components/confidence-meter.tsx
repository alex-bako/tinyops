import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

// Inline confidence indicator: "Confidence" + a thin bar + a mono percentage.
// Shared by the client memory callout and the grounded Ask answer so both read
// as the same AI-surface vocabulary. (Distinct from `Meter`, which is a
// full-width, label-above gauge.)
function ConfidenceMeter({
  pct,
  className,
}: {
  pct: number
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <span
      data-slot="confidence-meter"
      className={cn(
        "inline-flex items-center gap-2 text-[12px] text-muted-foreground",
        className
      )}
    >
      <span>Confidence</span>
      <span
        aria-hidden
        className="inline-block h-1 w-16 overflow-hidden rounded-full bg-cobalt-500/15"
      >
        <span
          data-testid="confidence-fill"
          className="block h-full rounded-full bg-cobalt-500 transition-[width] duration-(--dur-base) ease-(--ease-out)"
          style={{ width: `${clamped}%` }}
        />
      </span>
      <span className="font-mono tabular-nums text-foreground">
        {clamped}%
      </span>
    </span>
  )
}

export { ConfidenceMeter }
