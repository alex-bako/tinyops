import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Section } from "@workspace/ui/components/section"

import { WorkspacePageSurface } from "@/components/page-surface"
import {
  loadClientDetailPageAccess,
  loadClientMemoryRepository,
} from "@/features/clients/adapters/client-memory-loader"
import { clientProfileViewTransitionName } from "../_profile-routing"

import { ClientHeader } from "./_components/client-header"
import { MemoryCallout } from "./_components/memory-callout"
import { NotesComposerProvider } from "./_components/notes-focus-context"
import { NotesSurface } from "./_components/notes-section"
import { PropertiesSection } from "./_components/properties-section"
import { TimelineView } from "./_components/timeline-view"
import { createClientDetailView } from "./_view-model"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const [{ slug }, repository] = await Promise.all([
    params,
    loadClientMemoryRepository(),
  ])
  const client = await repository.findClientBySlug(slug)
  if (!client) return { title: "Client" }
  return {
    title: client.name,
    description: `What I know about ${client.name}: timeline, memory, next actions.`,
  }
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const [
    { slug },
    { repository, canManageNotes, canManageProperties, currentUserName },
  ] = await Promise.all([params, loadClientDetailPageAccess()])
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

      <NotesComposerProvider>
        <ClientHeader
          header={view.header}
          viewTransitionName={clientProfileViewTransitionName(slug)}
          canManageNotes={canManageNotes}
        />

        <MemoryCallout memory={view.memory} />

        <PropertiesSection
          clientId={view.clientId}
          initialProperties={view.properties}
          canManage={canManageProperties}
        />

        <Section divider>
          <TimelineView
            events={view.timeline}
            eventNotes={view.eventNotes}
            clientId={view.clientId}
            canManageNotes={canManageNotes}
            currentUserName={currentUserName}
          />
        </Section>

        <NotesSurface
          clientId={view.clientId}
          initialNotes={view.notes}
          canManage={canManageNotes}
          currentUserName={currentUserName}
        />
      </NotesComposerProvider>
    </WorkspacePageSurface>
  )
}
