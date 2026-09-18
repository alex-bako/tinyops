import { describe, expect, it } from "vitest"

import type { HomeSourceRow } from "@/lib/sources"

import {
  buildSearchModel,
  filterSources,
  type ClientSearchItem,
} from "./home-search-model"

function client(overrides: Partial<ClientSearchItem> = {}): ClientSearchItem {
  return {
    slug: "anna-smith",
    name: "Anna Smith",
    email: "anna@example.com",
    status: "active",
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
      clientMatches: [],
      sources,
      recentClients: [client(), client({ slug: "mariko-tan", name: "Mariko Tan" })],
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
      clientMatches: [],
      sources,
      recentClients: [],
    })
    expect(model.groups.map((g) => g.label)).toEqual(["Quick actions"])
  })

  it("never shows the Ask AI row before the user types", () => {
    const model = buildSearchModel({
      query: "",
      clientMatches: [],
      sources,
      recentClients: [client()],
    })
    expect(model.groups.some((g) => g.label === "Ask AI")).toBe(false)
  })

  it("offers no 'View all clients' action, because the list is already here", () => {
    const model = buildSearchModel({
      query: "",
      clientMatches: [],
      sources,
      recentClients: [],
    })
    const labels = model.groups
      .flatMap((g) => g.items)
      .map((i) => (i.kind === "action" ? i.label : ""))
    expect(labels).not.toContain("View all clients")
  })
})

describe("buildSearchModel — typed query", () => {
  it("leads with a disabled Ask AI row, then matched clients and sources", () => {
    const model = buildSearchModel({
      query: "anna",
      clientMatches: [client()],
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

  it("takes its clients from the rows the list is showing, not a second query", () => {
    const matches = [client(), client({ slug: "mariko-tan", name: "Mariko Tan" })]
    const model = buildSearchModel({
      query: "a",
      clientMatches: matches,
      sources: [],
      recentClients: [],
    })

    const clients = model.groups.find((g) => g.label === "Clients")!
    expect(clients.items.map((i) => (i.kind === "client" ? i.slug : ""))).toEqual([
      "anna-smith",
      "mariko-tan",
    ])
  })

  it("counts every match but offers only the first eight to jump to", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      client({ slug: `c-${i}`, name: `Client ${i}` })
    )
    const model = buildSearchModel({
      query: "client",
      clientMatches: many,
      sources: [],
      recentClients: [],
    })
    const clients = model.groups.find((g) => g.label === "Clients")!
    expect(clients.count).toBe(12)
    expect(clients.items).toHaveLength(8)
  })

  it("reports no results when nothing real matches (only Ask remains)", () => {
    const model = buildSearchModel({
      query: "zzzzz",
      clientMatches: [],
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
