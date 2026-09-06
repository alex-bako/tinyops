import { describe, expect, it } from "vitest"

import type { ClientSearchResult } from "@/features/clients/application/client-memory"
import type { HomeSourceRow } from "@/lib/sources"

import {
  buildSearchModel,
  filterSources,
  type RecentClientItem,
} from "./home-search-model"

function recent(overrides: Partial<RecentClientItem> = {}): RecentClientItem {
  return {
    slug: "anna-smith",
    name: "Anna Smith",
    email: "anna@example.com",
    status: "active",
    sources: 3,
    ...overrides,
  }
}

function result(overrides: Partial<ClientSearchResult> = {}): ClientSearchResult {
  return {
    id: "c1",
    slug: "anna-smith",
    name: "Anna Smith",
    email: "anna@example.com",
    lastInteractionAt: null,
    sourceCount: 3,
    ...overrides,
  }
}

function source(overrides: Partial<HomeSourceRow> = {}): HomeSourceRow {
  return {
    id: "imap",
    icon: "mail",
    title: "IMAP mailbox",
    sub: "hello@yourpractice.com",
    connected: true,
    status: "2m ago",
    ...overrides,
  }
}

const sources = [
  source(),
  source({ id: "forms", icon: "forms", title: "Intake form", sub: "203 submissions", connected: false }),
]

describe("buildSearchModel — empty query (focused)", () => {
  it("shows recently viewed clients then quick actions", () => {
    const model = buildSearchModel({
      query: "",
      clientResults: [],
      sources,
      recentClients: [recent(), recent({ slug: "mariko-tan", name: "Mariko Tan" })],
    })

    expect(model.groups.map((g) => g.label)).toEqual([
      "Recently viewed",
      "Quick actions",
    ])
    expect(model.groups[0]!.items).toHaveLength(2)
    expect(model.noResults).toBe(false)
  })

  it("omits recently viewed when there are no recent clients", () => {
    const model = buildSearchModel({
      query: "",
      clientResults: [],
      sources,
      recentClients: [],
    })
    expect(model.groups.map((g) => g.label)).toEqual(["Quick actions"])
  })

  it("never shows the Ask AI row before the user types", () => {
    const model = buildSearchModel({
      query: "",
      clientResults: [],
      sources,
      recentClients: [recent()],
    })
    expect(model.groups.some((g) => g.label === "Ask AI")).toBe(false)
  })
})

describe("buildSearchModel — typed query", () => {
  it("leads with a disabled Ask AI row, then matched clients and sources", () => {
    const model = buildSearchModel({
      query: "anna",
      clientResults: [result()],
      sources,
      recentClients: [],
    })

    expect(model.groups[0]!.label).toBe("Ask AI")
    const ask = model.groups[0]!.items[0]!
    expect(ask.kind).toBe("ask")
    expect(ask.disabled).toBe(true)

    expect(model.groups.map((g) => g.label)).toContain("Clients")
    expect(model.noResults).toBe(false)
  })

  it("flags a count on the Clients group only when it exceeds five", () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      result({ id: `c${i}`, slug: `c-${i}`, name: `Client ${i}` })
    )
    const model = buildSearchModel({
      query: "client",
      clientResults: many,
      sources: [],
      recentClients: [],
    })
    const clients = model.groups.find((g) => g.label === "Clients")!
    expect(clients.count).toBe(6)
  })

  it("reports no results when nothing real matches (only Ask remains)", () => {
    const model = buildSearchModel({
      query: "zzzzz",
      clientResults: [],
      sources,
      recentClients: [],
    })
    expect(model.noResults).toBe(true)
    expect(model.groups.map((g) => g.label)).toEqual(["Ask AI"])
  })
})

describe("filterSources", () => {
  it("matches on title and sub, case-insensitively", () => {
    expect(filterSources(sources, "INTAKE").map((s) => s.id)).toEqual([
      "forms",
    ])
    expect(filterSources(sources, "yourpractice").map((s) => s.id)).toEqual([
      "imap",
    ])
  })

  it("returns nothing for a blank query", () => {
    expect(filterSources(sources, "   ")).toEqual([])
  })
})
