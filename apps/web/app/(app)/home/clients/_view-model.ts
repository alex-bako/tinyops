"use client"

import * as React from "react"

import {
  COHORTS,
  type ClientDetail,
  type CohortFilter,
} from "@/features/clients/application/client-memory"

import { FILTER_TABS, countFor, matchesFilter, type FilterId } from "./_filters"

type ClientListFilters = {
  filter: FilterId
  cohort: CohortFilter
  query: string
}

type ClientListFilterPatch = Partial<ClientListFilters>
type ClientListCounts = Record<FilterId, number>

const DEFAULT_CLIENT_LIST_FILTERS: ClientListFilters = {
  filter: "all",
  cohort: COHORTS[0],
  query: "",
}

const CLIENT_LIST_EMPTY_MESSAGE = "No clients match these filters."

function applyClientListFilterPatch(
  current: ClientListFilters,
  patch: ClientListFilterPatch
): ClientListFilters {
  return { ...current, ...patch }
}

function buildClientListCounts(rows: ClientDetail[]): ClientListCounts {
  return Object.fromEntries(
    FILTER_TABS.map((t) => [t.id, countFor(rows, t.id)])
  ) as ClientListCounts
}

function clientMatchesQuery(c: ClientDetail, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
}

function filterClientRows(
  rows: ClientDetail[],
  filters: ClientListFilters
): ClientDetail[] {
  return rows.filter((c) => {
    if (!matchesFilter(c, filters.filter)) return false
    if (filters.cohort !== "All cohorts" && c.cohort !== filters.cohort) {
      return false
    }
    return clientMatchesQuery(c, filters.query)
  })
}

function createClientListView(
  sourceRows: ClientDetail[],
  filters: ClientListFilters = DEFAULT_CLIENT_LIST_FILTERS
) {
  const rows = filterClientRows(sourceRows, filters)
  return {
    filters,
    counts: buildClientListCounts(sourceRows),
    rows,
    total: sourceRows.length,
    empty: rows.length === 0,
    emptyMessage: CLIENT_LIST_EMPTY_MESSAGE,
  }
}

function getNewClientSlugs(
  previousSlugs: ReadonlySet<string>,
  nextRows: ClientDetail[]
): Set<string> {
  const fresh = new Set<string>()
  for (const row of nextRows) {
    if (!previousSlugs.has(row.slug)) fresh.add(row.slug)
  }
  return fresh
}

function useClientListView(sourceRows: ClientDetail[]) {
  const [filters, setFilters] = React.useState<ClientListFilters>(
    DEFAULT_CLIENT_LIST_FILTERS
  )

  const view = React.useMemo(
    () => createClientListView(sourceRows, filters),
    [sourceRows, filters]
  )

  const updateFilters = React.useCallback((patch: ClientListFilterPatch) => {
    setFilters((current) => applyClientListFilterPatch(current, patch))
  }, [])

  const clearFilters = React.useCallback(() => {
    setFilters(DEFAULT_CLIENT_LIST_FILTERS)
  }, [])

  return {
    ...view,
    updateFilters,
    clearFilters,
  }
}

export {
  DEFAULT_CLIENT_LIST_FILTERS,
  applyClientListFilterPatch,
  createClientListView,
  getNewClientSlugs,
  useClientListView,
}
export type { ClientListCounts, ClientListFilters, ClientListFilterPatch }
