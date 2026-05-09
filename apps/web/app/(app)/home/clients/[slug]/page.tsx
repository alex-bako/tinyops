import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, FilterIcon, EyeOffIcon, PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Section, SectionHead } from "@workspace/ui/components/section"

import { WorkspacePageSurface } from "@/components/page-surface"
import { getClientMemoryRepository } from "@/lib/client-memory/loaders"

import { ClientHeader } from "./_components/client-header"
import { MemoryCallout } from "./_components/memory-callout"
import { NotesEmpty } from "./_components/notes-empty"
import { Properties } from "./_components/properties"
import { TimelineSection } from "./_components/timeline-section"
import { createClientDetailView } from "./_view-model"

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const client = await getClientMemoryRepository().findClientBySlug(slug)
  if (!client) notFound()

  const view = createClientDetailView(client)

  return (
    <WorkspacePageSurface>
      <div className="mb-[18px]">
        <Button asChild variant="tertiary" size="sm">
          <Link href="/home/clients">
            <ArrowLeftIcon />
            Back to all clients
          </Link>
        </Button>
      </div>

      <ClientHeader header={view.header} />

      <MemoryCallout memory={view.memory} />

      <Section divider>
        <SectionHead
          title="Properties"
          count={view.propertiesCount}
          actions={
            <Button variant="tertiary" size="sm">
              <PlusIcon />
              Add property
            </Button>
          }
        />
        <Properties properties={view.properties} />
      </Section>

      <Section divider>
        <SectionHead
          title="Timeline"
          count={view.timelineCount}
          actions={
            <>
              <Button variant="tertiary" size="sm">
                <FilterIcon />
                Filter
              </Button>
              <Button variant="tertiary" size="sm">
                <EyeOffIcon />
                Hide sensitive
              </Button>
            </>
          }
        />
        <TimelineSection events={view.timeline} />
      </Section>

      <Section divider>
        <SectionHead title="Notes" />
        <NotesEmpty />
      </Section>
    </WorkspacePageSurface>
  )
}
