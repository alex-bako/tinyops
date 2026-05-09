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
        "py-2",
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
  actions,
  className,
}: {
  title: string
  count?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mb-3 flex items-center gap-2",
        className
      )}
    >
      <h3
        className={cn(
          "m-0 font-sans text-[13px] font-semibold uppercase tracking-[0.02em] text-muted-foreground"
        )}
      >
        {title}
      </h3>
      {count ? (
        <span className="font-mono text-[12px] text-muted-foreground/70">
          {count}
        </span>
      ) : null}
      {actions ? (
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      ) : null}
    </div>
  )
}

export { Section, SectionHead }
