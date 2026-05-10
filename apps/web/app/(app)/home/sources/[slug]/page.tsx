import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { WorkspacePageSurface } from "@/components/page-surface"
import { loadWorkspaceSourceCatalog } from "@/features/data-sources/loaders"

import { ActivityBlock } from "./_components/activity-block"
import { ConfigBlock } from "./_components/config-block"
import { ConnectionBlock } from "./_components/connection-block"
import { DangerZone } from "./_components/danger-zone"
import { SourceHeader } from "./_components/source-header"
import { SyncAttemptsBlock } from "./_components/sync-attempts-block"
import { createSourceDetailView } from "./_view-model"
import { getSourceUi } from "./source-registry"

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const source = (await loadWorkspaceSourceCatalog()).find(
    (candidate) => candidate.id === slug
  )
  if (!source) notFound()

  const sourceUi = getSourceUi(source.id)
  const view = createSourceDetailView(source, sourceUi)

  return (
    <WorkspacePageSurface>
      <div className="mb-[18px]">
        <Button asChild variant="tertiary" size="sm">
          <Link href="/home/sources">
            <ArrowLeftIcon />
            Back to all sources
          </Link>
        </Button>
      </div>

      <SourceHeader header={view.header} actions={view.actions} />

      <ConnectionBlock source={source} sourceUi={sourceUi} />

      <ConfigBlock source={source} sourceUi={sourceUi} />

      {view.connected && view.activity.length > 0 ? (
        <ActivityBlock activity={view.activity} />
      ) : null}

      {view.connected ? (
        <SyncAttemptsBlock attempts={view.syncAttempts} />
      ) : null}

      {view.connected && source.sourceRowId ? (
        <DangerZone sourceRowId={source.sourceRowId} title={view.header.title} />
      ) : null}
    </WorkspacePageSurface>
  )
}
