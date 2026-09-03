import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { WorkspacePageSurface } from "@/components/page-surface"
import { SourceSyncRealtimeRefresh } from "@/features/data-sources/adapters/source-sync-realtime-refresh"
import { loadWorkspaceSourceBySlug } from "@/features/data-sources/loaders"
import type { DataSource } from "@/lib/sources"

import { ActivityBlock } from "../_components/activity-block"
import { ConfigBlock } from "../_components/config-block"
import { ConnectionBlock } from "../_components/connection-block"
import { DangerZone } from "../_components/danger-zone"
import { SourceHeader } from "../_components/source-header"
import { SyncAttemptsBlock } from "../_components/sync-attempts-block"
import { createSourceDetailView } from "../_view-model"
import { getSourceUi } from "../source-registry"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sourceType: string; sourceSlug: string }>
}): Promise<Metadata> {
  const { sourceType, sourceSlug } = await params
  const source = await loadWorkspaceSourceBySlug({ sourceType, sourceSlug })
  if (!source) return { title: "Data source" }
  return {
    title: source.title,
    description: `Sync status and history for ${source.title}.`,
  }
}

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ sourceType: string; sourceSlug: string }>
}) {
  const { sourceType, sourceSlug } = await params
  const source = await loadWorkspaceSourceBySlug({ sourceType, sourceSlug })
  if (!source) notFound()

  const sourceUi = getSourceUi(source.id)
  const view = createSourceDetailView(source, sourceUi)
  const activeSourceIds = activeSyncSourceIds(source)

  return (
    <WorkspacePageSurface>
      <SourceSyncRealtimeRefresh
        activeSourceIds={activeSourceIds}
        sourceIds={detailSourceIds(source)}
      />

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

      {view.connected && view.actions.sourceId ? (
        <DangerZone
          sourceId={view.actions.sourceId}
          title={view.header.title}
        />
      ) : null}
    </WorkspacePageSurface>
  )
}

function detailSourceIds(source: DataSource) {
  return source.kind === "data_source" ? [source.sourceId] : []
}

function activeSyncSourceIds(source: DataSource) {
  if (source.kind !== "data_source") return []
  if (
    isActiveSyncStatus(source.imap?.syncStatus) ||
    isActiveSyncStatus(source.stripe?.syncStatus) ||
    isActiveSyncStatus(source.mailerlite?.syncStatus)
  )
    return [source.sourceId]
  return (source.forms?.connections ?? []).flatMap((connection) =>
    isActiveSyncStatus(connection.syncStatus) ? [connection.sourceId] : []
  )
}

function isActiveSyncStatus(status: string | undefined) {
  return status === "queued" || status === "running"
}
