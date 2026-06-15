import * as React from "react"

import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

/* Shared building blocks for route-level loading skeletons. These mirror the
 * real page chrome (WorkspacePageHeader, list rows) so the swap from skeleton
 * to content doesn't shift layout. */

export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mb-8", className)}>
      <Skeleton className="h-3.5 w-44 rounded-full" />
      <Skeleton className="mt-3.5 h-9 w-[min(440px,72%)] rounded-md" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3.5 w-[min(560px,92%)] rounded-full" />
        <Skeleton className="h-3.5 w-[min(420px,68%)] rounded-full" />
      </div>
    </div>
  )
}

export function SectionHeadSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-border pb-2.5",
        className
      )}
    >
      <Skeleton className="h-4 w-32 rounded-full" />
      <Skeleton className="h-6 w-20 rounded-md" />
    </div>
  )
}

/** A generic list row: leading avatar, two stacked lines, trailing meta. */
export function ListRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-border py-3",
        className
      )}
    >
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-40 rounded-full" />
        <Skeleton className="h-3 w-56 max-w-[70%] rounded-full" />
      </div>
      <Skeleton className="h-3.5 w-16 rounded-full" />
    </div>
  )
}

export function ListRowsSkeleton({
  rows = 6,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  )
}
