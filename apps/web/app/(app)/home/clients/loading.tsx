import { Skeleton } from "@workspace/ui/components/skeleton"

import {
  ListRowsSkeleton,
  PageHeaderSkeleton,
} from "@/components/page-skeleton"
import { WorkspacePageSurface } from "@/components/page-surface"

export default function Loading() {
  return (
    <WorkspacePageSurface>
      <PageHeaderSkeleton />

      {/* toolbar: filter tabs + search/actions */}
      <div className="-mx-1 flex flex-wrap items-center gap-1.5 border-b border-border px-1 py-2">
        <Skeleton className="h-[26px] w-64 rounded-md" />
        <div className="ml-auto flex items-center gap-1.5">
          <Skeleton className="h-[26px] w-[220px] rounded-sm" />
          <Skeleton className="h-[26px] w-24 rounded-sm" />
          <Skeleton className="h-[26px] w-24 rounded-sm" />
        </div>
      </div>

      <ListRowsSkeleton rows={9} className="mt-1" />
    </WorkspacePageSurface>
  )
}
