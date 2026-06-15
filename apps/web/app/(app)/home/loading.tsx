import { Skeleton } from "@workspace/ui/components/skeleton"

import {
  ListRowsSkeleton,
  PageHeaderSkeleton,
  SectionHeadSkeleton,
} from "@/components/page-skeleton"
import { WorkspacePageSurface } from "@/components/page-surface"

export default function Loading() {
  return (
    <WorkspacePageSurface>
      <PageHeaderSkeleton />

      {/* search bar */}
      <Skeleton className="mt-7 mb-8 h-[46px] w-full rounded-md" />

      <div className="grid gap-x-14 gap-y-10 md:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-10">
          <section>
            <SectionHeadSkeleton />
            <ListRowsSkeleton rows={5} />
          </section>
          <section>
            <SectionHeadSkeleton />
            <ListRowsSkeleton rows={2} />
          </section>
        </div>
        <div className="flex flex-col gap-10">
          <section>
            <SectionHeadSkeleton />
            <ListRowsSkeleton rows={3} />
          </section>
          <section>
            <SectionHeadSkeleton />
            <ListRowsSkeleton rows={3} />
          </section>
        </div>
      </div>
    </WorkspacePageSurface>
  )
}
