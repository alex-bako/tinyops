import { Skeleton } from "@workspace/ui/components/skeleton"

import {
  PageHeaderSkeleton,
  SectionHeadSkeleton,
} from "@/components/page-skeleton"
import { WorkspacePageSurface } from "@/components/page-surface"

export default function Loading() {
  return (
    <WorkspacePageSurface>
      <PageHeaderSkeleton />

      <div className="mt-8 grid gap-10 md:grid-cols-[200px_1fr]">
        {/* settings rail */}
        <div className="flex flex-col gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full rounded-md" />
          ))}
        </div>

        {/* settings section */}
        <div className="flex flex-col gap-8">
          <section>
            <SectionHeadSkeleton />
            <div className="mt-4 flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          </section>
        </div>
      </div>
    </WorkspacePageSurface>
  )
}
