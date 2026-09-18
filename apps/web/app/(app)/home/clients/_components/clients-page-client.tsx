"use client"

import * as React from "react"
import { UsersIcon } from "lucide-react"

import { Kbd } from "@workspace/ui/components/kbd"
import { EditorialItalic } from "@workspace/ui/components/typography"

import {
  WorkspacePageFooter,
  WorkspacePageHeader,
  WorkspacePageSurface,
} from "@/components/page-surface"
import { HomeSearch } from "@/app/(app)/home/_components/home-search"
import type { RecentClientItem } from "@/app/(app)/home/_components/home-search-model"
import { ClientProfileRealtimeRefresh } from "@/features/clients/adapters/client-profile-realtime-refresh"
import type { ClientListEntry } from "@/features/clients/application/client-memory"
import { useActiveWorkspace } from "@/features/workspaces/context"
import type { HomeSourceRow } from "@/lib/sources"

import { ClientsTable } from "./clients-table"
import { ClientsToolbar } from "./clients-toolbar"
import { getNewClientSlugs, useClientListView } from "../_view-model"

export function ClientsPageClient({
  rows: sourceRows,
  recentClients,
  sources,
}: {
  rows: ClientListEntry[]
  recentClients: RecentClientItem[]
  sources: HomeSourceRow[]
}) {
  const activeWorkspace = useActiveWorkspace()
  const {
    filters,
    updateFilters,
    counts,
    rows,
    total,
    workspaceEmpty,
    emptyMessage,
    clearFilters,
  } = useClientListView(sourceRows)

  const newlyInsertedSlugs = useNewlyInsertedSlugs(sourceRows)

  return (
    <WorkspacePageSurface>
      <ClientProfileRealtimeRefresh workspaceId={activeWorkspace.id} />

      <WorkspacePageHeader
        eyebrowIcon={UsersIcon}
        eyebrow={activeWorkspace.name}
        title={
          <>
            All clients.{" "}
            <EditorialItalic className="text-cobalt-500">
              {total}
            </EditorialItalic>{" "}
            in your practice.
          </>
        }
        description="Everyone you've imported, with everything TinyOps has learned about them. Search by name or email, filter by status, cohort, or flag, open any row to see their full timeline."
      />

      <HomeSearch
        query={filters.query}
        onQueryChange={(query) => updateFilters({ query })}
        clientMatches={rows}
        recentClients={recentClients}
        sources={sources}
      />

      <ClientsToolbar
        filters={filters}
        updateFilters={updateFilters}
        counts={counts}
      />

      <ClientsTable
        rows={rows}
        emptyMessage={emptyMessage}
        onClear={clearFilters}
        workspaceEmpty={workspaceEmpty}
        newlyInsertedSlugs={newlyInsertedSlugs}
      />

      <WorkspacePageFooter>
        <span>
          {rows.length} of {total} shown
        </span>
        <span aria-hidden className="text-muted-foreground/40">
          ·
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground/70">
          Type <Kbd>/</Kbd> for views, sorts, and bulk actions
        </span>
      </WorkspacePageFooter>
    </WorkspacePageSurface>
  )
}

function useNewlyInsertedSlugs(sourceRows: ClientListEntry[]): Set<string> {
  const seenSlugsRef = React.useRef(new Set(sourceRows.map((r) => r.slug)))
  const [fresh, setFresh] = React.useState<Set<string>>(
    () => new Set<string>()
  )

  React.useEffect(() => {
    setFresh(getNewClientSlugs(seenSlugsRef.current, sourceRows))
    seenSlugsRef.current = new Set(sourceRows.map((r) => r.slug))
  }, [sourceRows])

  return fresh
}
