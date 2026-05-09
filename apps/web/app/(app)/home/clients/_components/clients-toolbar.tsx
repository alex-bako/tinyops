"use client"

import * as React from "react"
import {
  SearchIcon,
  SlidersHorizontalIcon,
  UploadIcon,
  UserPlusIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  FilterTab,
  FilterTabCount,
  FilterTabs,
} from "@workspace/ui/components/filter-tab"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

import { COHORTS, type CohortFilter } from "@/lib/clients"
import { FILTER_TABS, type FilterId } from "../_data"

type Counts = Record<FilterId, number>

export function ClientsToolbar({
  filter,
  setFilter,
  cohort,
  setCohort,
  query,
  setQuery,
  counts,
}: {
  filter: FilterId
  setFilter: (id: FilterId) => void
  cohort: CohortFilter
  setCohort: (c: CohortFilter) => void
  query: string
  setQuery: (q: string) => void
  counts: Counts
}) {
  return (
    <div
      className={cn(
        "sticky top-11 z-[2] -mx-1 flex flex-wrap items-center gap-1.5 border-b border-border bg-background px-1 py-2"
      )}
    >
      <FilterTabs
        value={filter}
        onValueChange={(v) => setFilter(v as FilterId)}
        aria-label="Filter clients"
      >
        {FILTER_TABS.map((t) => (
          <FilterTab key={t.id} value={t.id}>
            {t.label}
            <FilterTabCount>{counts[t.id]}</FilterTabCount>
          </FilterTab>
        ))}
      </FilterTabs>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <label
          className={cn(
            "inline-flex h-[26px] w-[220px] items-center gap-1.5 rounded-sm border border-input bg-background px-2",
            "text-[12.5px] text-foreground transition-colors duration-(--dur-fast) ease-(--ease-out)",
            "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15"
          )}
        >
          <SearchIcon className="size-3.5 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name or email…"
            aria-label="Filter by name or email"
            className={cn(
              "min-w-0 flex-1 border-0 bg-transparent p-0 font-sans text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground/60"
            )}
          />
        </label>

        <Select
          value={cohort}
          onValueChange={(v) => setCohort(v as CohortFilter)}
        >
          <SelectTrigger
            size="sm"
            aria-label="Filter by cohort"
            className={cn(
              "h-[26px] gap-1 rounded-sm border-input px-2 py-0 font-sans text-[12.5px] text-foreground"
            )}
          >
            <SelectValue placeholder="All cohorts" />
          </SelectTrigger>
          <SelectContent>
            {COHORTS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="tertiary" size="sm">
          <SlidersHorizontalIcon />
          View
        </Button>
        <Button variant="secondary" size="sm">
          <UploadIcon />
          Import
        </Button>
        <Button variant="primary" size="sm">
          <UserPlusIcon />
          New client
        </Button>
      </div>
    </div>
  )
}
