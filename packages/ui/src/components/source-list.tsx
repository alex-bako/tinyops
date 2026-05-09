import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function SourceList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="source-list"
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
}

function SourceListRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="source-list-row"
      className={cn(
        "group/source-list-row -mx-2 grid grid-cols-[32px_minmax(0,1fr)_auto_auto] items-center gap-3.5 rounded-sm border-b border-border px-2 py-3.5 last:border-b-0",
        "transition-[background] duration-75 hover:bg-[var(--tint-hover)]",
        className
      )}
      {...props}
    />
  )
}

function SourceListIcon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="source-list-icon"
      aria-hidden
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-sm",
        className
      )}
      {...props}
    />
  )
}

function SourceListBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="source-list-body"
      className={cn("flex min-w-0 flex-col gap-[2px]", className)}
      {...props}
    />
  )
}

function SourceListTitle({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="source-list-title"
      className={cn(
        "text-[14px] font-medium tracking-[-0.005em] text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SourceListDescription({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="source-list-description"
      className={cn("truncate text-[12.5px] text-muted-foreground", className)}
      {...props}
    />
  )
}

function SourceListStats({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="source-list-stats"
      className={cn(
        "flex items-center gap-[18px] text-[12px] text-muted-foreground tabular-nums",
        className
      )}
      {...props}
    />
  )
}

function SourceListStat({
  label,
  value,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  label: React.ReactNode
  value: React.ReactNode
}) {
  return (
    <div
      data-slot="source-list-stat"
      className={cn("flex min-w-[60px] flex-col items-start gap-[1px]", className)}
      {...props}
    >
      <span data-slot="source-list-stat-label">{label}</span>
      <span
        data-slot="source-list-stat-value"
        className="text-[13.5px] font-medium text-foreground"
      >
        {value}
      </span>
    </div>
  )
}

function SourceListActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="source-list-actions"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  )
}

export {
  SourceList,
  SourceListActions,
  SourceListBody,
  SourceListDescription,
  SourceListIcon,
  SourceListRow,
  SourceListStat,
  SourceListStats,
  SourceListTitle,
}
