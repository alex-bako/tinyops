"use client"

import * as React from "react"

import { ALL_CLIENTS, COHORTS, type CohortFilter } from "@/lib/clients"

import { FILTER_TABS, countFor, matchesFilter, type FilterId } from "./_data"

type ClientListFilters = {
  filter: FilterId
  cohort: CohortFilter
  query: string
}

type ClientListFilterPatch = Partial<ClientListFilters>

const DEFAULT_FILTERS: ClientListFilters = {
  filter: "all",
  cohort: COHORTS[0],
  query: "",
}

function useClientListView() {
  const [filters, setFilters] = React.useState<ClientListFilters>(DEFAULT_FILTERS)

  const counts = React.useMemo(
    () =>
      Object.fromEntries(
        FILTER_TABS.map((t) => [t.id, countFor(ALL_CLIENTS, t.id)])
      ) as Record<FilterId, number>,
    []
  )

  const rows = React.useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return ALL_CLIENTS.filter((c) => {
      if (!matchesFilter(c, filters.filter)) return false
      if (filters.cohort !== "All cohorts" && c.cohort !== filters.cohort) {
        return false
      }
      if (
        q &&
        !c.name.toLowerCase().includes(q) &&
        !c.email.toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [filters])

  const updateFilters = React.useCallback((patch: ClientListFilterPatch) => {
    setFilters((current) => ({ ...current, ...patch }))
  }, [])

  const clearFilters = React.useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  return {
    filters,
    updateFilters,
    counts,
    rows,
    total: ALL_CLIENTS.length,
    clearFilters,
  }
}

export { useClientListView }
export type { ClientListFilters, ClientListFilterPatch }
