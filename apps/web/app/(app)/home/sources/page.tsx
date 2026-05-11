import type { Metadata } from "next"
import { PlugZapIcon, PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Section, SectionHead } from "@workspace/ui/components/section"

export const metadata: Metadata = {
  title: "Data sources",
  description:
    "Connectors that feed client memory — inboxes, sheets, forms.",
}

import {
  WorkspacePageHeader,
  WorkspacePageSurface,
} from "@/components/page-surface"
import { SourceSyncRealtimeRefresh } from "@/features/data-sources/adapters/source-sync-realtime-refresh"
import { loadWorkspaceSourceCatalog } from "@/features/data-sources/loaders"

import { SourceRow } from "./_components/source-row"
import { SourcesSyncAllButton } from "./_components/sources-sync-all-button"
import { createSourcesPageView } from "./_view-model"

export default async function SourcesPage() {
  const sources = await loadWorkspaceSourceCatalog()
  const view = createSourcesPageView(sources)
  const sourceRowIds = view.connected.rows.flatMap((source) =>
    source.sourceRowId ? [source.sourceRowId] : []
  )
  const activeSourceRowIds = sources.flatMap((source) =>
    source.sourceRowId && isActiveSyncStatus(source.imap?.syncStatus)
      ? [source.sourceRowId]
      : []
  )

  return (
    <WorkspacePageSurface>
      <SourceSyncRealtimeRefresh
        activeSourceRowIds={activeSourceRowIds}
        sourceRowIds={sourceRowIds}
      />

      <WorkspacePageHeader
        eyebrowIcon={PlugZapIcon}
        eyebrow="Workspace · data sources"
        title="Connect what you already have."
        description="TinyOps reads — never writes — from your existing tools. Each new event lands on the right client's timeline within a few minutes of arriving."
      />

      <Section className="mt-10">
        <SectionHead
          title="Connected"
          count={view.connected.count}
          actions={
            <SourcesSyncAllButton
              disabled={view.connected.rows.length === 0}
            />
          }
        />
        <div className="flex flex-col">
          {view.connected.rows.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
        </div>
      </Section>

      <Section divider>
        <SectionHead
          title="Available"
          count={view.available.count}
          actions={
            <Button type="button" variant="tertiary" size="sm">
              <PlusIcon />
              Request a connector
            </Button>
          }
        />
        <div className="flex flex-col">
          {view.available.rows.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
        </div>
      </Section>
    </WorkspacePageSurface>
  )
}

function isActiveSyncStatus(status: string | undefined) {
  return status === "queued" || status === "running"
}
