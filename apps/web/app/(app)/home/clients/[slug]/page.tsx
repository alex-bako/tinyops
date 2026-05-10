import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, FilterIcon, EyeOffIcon, PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Section, SectionHead } from "@workspace/ui/components/section"

import { WorkspacePageSurface } from "@/components/page-surface"
import { loadClientMemoryRepository } from "@/lib/client-memory/loaders"

import { ClientHeader } from "./_components/client-header"
import { MemoryCallout } from "./_components/memory-callout"
import { NotesEmpty } from "./_components/notes-empty"
import { Properties } from "./_components/properties"
import { TimelineSection } from "./_components/timeline-section"
import { createClientDetailView } from "./_view-model"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const repository = await loadClientMemoryRepository()
  const client = await repository.findClientBySlug(slug)
  if (!client) return { title: "Client" }
  return {
    title: client.name,
    description: `What I know about ${client.name} — timeline, memory, next actions.`,
  }
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const repository = await loadClientMemoryRepository()
  const client = await repository.findClientBySlug(slug)
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
