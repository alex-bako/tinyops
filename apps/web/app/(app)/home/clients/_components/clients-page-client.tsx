"use client"

import { UsersIcon } from "lucide-react"

import { Kbd } from "@workspace/ui/components/kbd"
import { EditorialItalic } from "@workspace/ui/components/typography"

import {
  WorkspacePageFooter,
  WorkspacePageHeader,
  WorkspacePageSurface,
} from "@/components/page-surface"
import { ClientProfileRealtimeRefresh } from "@/features/clients/adapters/client-profile-realtime-refresh"
import type { ClientDetail } from "@/features/clients/application/client-memory"
import { useActiveWorkspace } from "@/features/workspaces/context"

import { ClientsTable } from "./clients-table"
import { ClientsToolbar } from "./clients-toolbar"
import { useClientListView } from "../_view-model"

export function ClientsPageClient({
  rows: sourceRows,
}: {
  rows: ClientDetail[]
}) {
  const activeWorkspace = useActiveWorkspace()
  const {
    filters,
    updateFilters,
    counts,
    rows,
    total,
    emptyMessage,
    clearFilters,
  } = useClientListView(sourceRows)

  return (
    <WorkspacePageSurface>
      <ClientProfileRealtimeRefresh workspaceId={activeWorkspace.id} />

      <WorkspacePageHeader
        className="mb-8"
        eyebrowIcon={UsersIcon}
        eyebrow="Workspace · clients"
        title={
          <>
            All clients.{" "}
            <EditorialItalic className="text-cobalt-500">
              {total}
            </EditorialItalic>{" "}
            in your practice.
          </>
        }
        description="Every person you've imported, with everything TinyOps has learned about them. Filter by status, cohort, or flag — open any row to see their full timeline."
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
