"use client"

import * as React from "react"
import { UsersIcon } from "lucide-react"

import { Kbd } from "@workspace/ui/components/kbd"
import {
  Body,
  EditorialItalic,
  Eyebrow,
  H1,
} from "@workspace/ui/components/typography"
import { cn } from "@workspace/ui/lib/utils"

import { ALL_CLIENTS, COHORTS, type CohortFilter } from "@/lib/clients"
import { ClientsTable } from "./_components/clients-table"
import { ClientsToolbar } from "./_components/clients-toolbar"
import { FILTER_TABS, countFor, matchesFilter, type FilterId } from "./_data"

export default function ClientsPage() {
  const [filter, setFilter] = React.useState<FilterId>("all")
  const [cohort, setCohort] = React.useState<CohortFilter>(COHORTS[0])
  const [query, setQuery] = React.useState("")

  const counts = React.useMemo(
    () =>
      Object.fromEntries(
        FILTER_TABS.map((t) => [t.id, countFor(ALL_CLIENTS, t.id)])
      ) as Record<FilterId, number>,
    []
  )

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return ALL_CLIENTS.filter((c) => {
      if (!matchesFilter(c, filter)) return false
      if (cohort !== "All cohorts" && c.cohort !== cohort) return false
      if (q && !c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q))
        return false
      return true
    })
  }, [filter, cohort, query])

  const clearFilters = React.useCallback(() => {
    setFilter("all")
    setCohort(COHORTS[0])
    setQuery("")
  }, [])

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
            {ALL_CLIENTS.length}
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
        filter={filter}
        setFilter={setFilter}
        cohort={cohort}
        setCohort={setCohort}
        query={query}
        setQuery={setQuery}
        counts={counts}
      />

      <ClientsTable rows={rows} total={ALL_CLIENTS.length} onClear={clearFilters} />

      <footer
        className={cn(
          "flex flex-wrap items-center gap-2 px-0.5 pt-3.5",
          "font-mono text-[12px] text-muted-foreground"
        )}
      >
        <span>
          {rows.length} of {ALL_CLIENTS.length} shown
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
