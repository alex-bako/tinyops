"use client"

import { UsersIcon } from "lucide-react"

import { Kbd } from "@workspace/ui/components/kbd"
import {
  Body,
  EditorialItalic,
  Eyebrow,
  H1,
} from "@workspace/ui/components/typography"
import { cn } from "@workspace/ui/lib/utils"

import { ClientsTable } from "./_components/clients-table"
import { ClientsToolbar } from "./_components/clients-toolbar"
import { useClientListView } from "./_view-model"

export default function ClientsPage() {
  const { filters, updateFilters, counts, rows, total, clearFilters } =
    useClientListView()

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1200px] px-6 pt-10 pb-24 md:px-14 md:pt-14"
      )}
    >
      <div className="mb-8">
        <Eyebrow className="inline-flex items-center gap-1.5 [&>svg]:size-3.5">
          <UsersIcon />
          <span>Workspace · clients</span>
        </Eyebrow>

        <H1
          className={cn(
            "mt-3 text-[38px] font-bold leading-[1.15] tracking-[-0.025em]"
          )}
        >
          All clients.{" "}
          <EditorialItalic className="text-cobalt-500">
            {total}
          </EditorialItalic>{" "}
          in your practice.
        </H1>

        <Body
          size="lg"
          className="mt-2.5 max-w-[640px] text-[15px] leading-[1.55] text-muted-foreground"
        >
          Every person you&apos;ve imported, with everything TinyOps has learned
          about them. Filter by status, cohort, or flag — open any row to see
          their full timeline.
        </Body>
      </div>

      <ClientsToolbar
        filters={filters}
        updateFilters={updateFilters}
        counts={counts}
      />

      <ClientsTable rows={rows} onClear={clearFilters} />

      <footer
        className={cn(
          "flex flex-wrap items-center gap-2 px-0.5 pt-3.5",
          "font-mono text-[12px] text-muted-foreground"
        )}
      >
        <span>
          {rows.length} of {total} shown
        </span>
        <span aria-hidden className="text-muted-foreground/40">
          ·
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground/70">
          Type <Kbd>/</Kbd> for views, sorts, and bulk actions
        </span>
      </footer>
    </div>
  )
}
