import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function DsSection({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "border-t border-border py-6 first-of-type:border-t-0 first-of-type:pt-7",
        className
      )}
    >
      {children}
    </section>
  )
}

function DsSectionHead({
  title,
  hint,
  actions,
  tone = "default",
}: {
  title: React.ReactNode
  hint?: React.ReactNode
  actions?: React.ReactNode
  tone?: "default" | "danger"
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-3">
      <h3
        className={cn(
          "m-0 font-sans text-[13px] font-semibold uppercase tracking-[0.02em]",
          tone === "danger" ? "text-coral-700" : "text-muted-foreground"
        )}
      >
        {title}
      </h3>
      {hint ? (
        <span className="text-[12.5px] font-normal normal-case tracking-normal text-muted-foreground">
          {hint}
        </span>
      ) : null}
      {actions ? (
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      ) : null}
    </div>
  )
}

export { DsSection, DsSectionHead }
