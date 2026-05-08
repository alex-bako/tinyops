import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function Section({
  className,
  divider = false,
  ...props
}: React.ComponentProps<"section"> & { divider?: boolean }) {
  return (
    <section
      data-slot="section"
      className={cn(
        "py-1",
        divider && "mt-7 border-t border-border pt-7",
        className
      )}
      {...props}
    />
  )
}

function SectionHead({
  title,
  count,
  right,
  className,
}: {
  title: string
  count?: React.ReactNode
  right?: React.ReactNode
  className?: string
}) {
  return (
    <header
      className={cn("mb-3 flex items-center gap-2", className)}
      data-slot="section-head"
    >
      <h3 className="m-0 text-[13px] font-semibold uppercase tracking-[0.02em] text-muted-foreground">
        {title}
      </h3>
      {count !== undefined && count !== null && (
        <span className="font-mono text-[12px] text-slate-500/70">{count}</span>
      )}
      {right && <div className="ml-auto flex items-center gap-1">{right}</div>}
    </header>
  )
}

export { Section, SectionHead }
