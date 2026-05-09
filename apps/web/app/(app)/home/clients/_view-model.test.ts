import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { ALL_CLIENTS } from "@/lib/clients"

import {
  DEFAULT_CLIENT_LIST_FILTERS,
  applyClientListFilterPatch,
  createClientListView,
} from "./_view-model"

describe("client list view model", () => {
  it("filters rows by status flag and keeps global counts", () => {
    const view = createClientListView(ALL_CLIENTS, {
      ...DEFAULT_CLIENT_LIST_FILTERS,
      filter: "overdue",
    })

    expect(view.rows).toHaveLength(5)
    expect(view.counts.overdue).toBe(5)
    expect(view.counts.all).toBe(20)
  })

  it("applies cohort and query together", () => {
    const view = createClientListView(ALL_CLIENTS, {
      filter: "all",
      cohort: "March cohort",
      query: "anna@example.com",
    })

    expect(view.rows.map((c) => c.slug)).toEqual(["anna-smith"])
  })

  it("filters rows from the injected loader data", () => {
    const rows = [ALL_CLIENTS[0]!, ALL_CLIENTS[8]!]
    const view = createClientListView(rows, {
      ...DEFAULT_CLIENT_LIST_FILTERS,
      filter: "dnc",
    })

    expect(view.rows.map((client) => client.slug)).toEqual(["eve-kowalski"])
    expect(view.counts.all).toBe(2)
    expect(view.counts.dnc).toBe(1)
  })

  it("returns stable empty-state copy for no matches", () => {
    const view = createClientListView(ALL_CLIENTS, {
      ...DEFAULT_CLIENT_LIST_FILTERS,
      query: "nobody@example.com",
    })

    expect(view.rows).toEqual([])
    expect(view.empty).toBe(true)
    expect(view.emptyMessage).toBe("No clients match these filters.")
  })

  it("applies filter patches without mutating current filters", () => {
    const next = applyClientListFilterPatch(DEFAULT_CLIENT_LIST_FILTERS, {
      query: "anna",
    })

    expect(next).toEqual({
      ...DEFAULT_CLIENT_LIST_FILTERS,
      query: "anna",
    })
    expect(DEFAULT_CLIENT_LIST_FILTERS.query).toBe("")
  })

  it("does not hide a global client list inside the hook", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/(app)/home/clients/_view-model.ts"),
      "utf8"
    )

    expect(source).not.toContain("ALL_CLIENTS")
  })
})
