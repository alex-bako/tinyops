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
  SearchField,
  SearchFieldIcon,
  SearchFieldInput,
} from "@workspace/ui/components/search-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

import { COHORTS } from "@/lib/clients"
import { FILTER_TABS, type FilterId } from "../_data"
import type { ClientListFilterPatch, ClientListFilters } from "../_view-model"

type Counts = Record<FilterId, number>

export function ClientsToolbar({
  filters,
  updateFilters,
  counts,
}: {
  filters: ClientListFilters
  updateFilters: (patch: ClientListFilterPatch) => void
  counts: Counts
}) {
  return (
    <div
      className={cn(
        "sticky top-11 z-[2] -mx-1 flex flex-wrap items-center gap-1.5 border-b border-border bg-background px-1 py-2"
      )}
    >
      <FilterTabs
        value={filters.filter}
        onValueChange={(v) => updateFilters({ filter: v as FilterId })}
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
        <SearchField variant="compact" className="w-[220px]">
          <SearchFieldIcon variant="compact">
            <SearchIcon />
          </SearchFieldIcon>
          <SearchFieldInput
            variant="compact"
            value={filters.query}
            onChange={(e) => updateFilters({ query: e.target.value })}
            placeholder="Filter by name or email…"
            aria-label="Filter by name or email"
          />
        </SearchField>

        <Select
          value={filters.cohort}
          onValueChange={(v) =>
            updateFilters({ cohort: v as ClientListFilters["cohort"] })
          }
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
