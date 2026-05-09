import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function Meter({
  label,
  value,
  fraction,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  fraction: number
  className?: string
}) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100
  return (
    <div data-slot="meter" className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between text-[12.5px] text-muted-foreground">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(15,23,42,0.06)]">
        <span
          data-testid="meter-fill"
          className="block h-full rounded-full bg-cobalt-500 transition-[width] duration-(--dur-base) ease-(--ease-out)"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export { Meter }
