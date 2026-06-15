import { Skeleton } from "@workspace/ui/components/skeleton"

import { ListRowsSkeleton } from "@/components/page-skeleton"
import { WorkspacePageSurface } from "@/components/page-surface"

export default function Loading() {
  return (
    <WorkspacePageSurface>
      {/* back link */}
      <Skeleton className="mb-[18px] h-7 w-40 rounded-md" />

      {/* client header: avatar + name/email + actions */}
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-56 rounded-md" />
          <Skeleton className="h-4 w-64 max-w-[60%] rounded-full" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>

      {/* memory callout */}
      <Skeleton className="mt-7 h-20 w-full rounded-lg" />

      {/* properties */}
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-md" />
        ))}
      </div>

      {/* timeline */}
      <div className="mt-10">
        <Skeleton className="mb-4 h-4 w-32 rounded-full" />
        <ListRowsSkeleton rows={5} />
      </div>
    </WorkspacePageSurface>
  )
}
