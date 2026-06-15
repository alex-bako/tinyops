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

      <section className="mt-10">
        <SectionHeadSkeleton />
        <ListRowsSkeleton rows={4} />
      </section>

      <section className="mt-10">
        <SectionHeadSkeleton />
        <ListRowsSkeleton rows={5} />
      </section>
    </WorkspacePageSurface>
  )
}
