import { describe, expect, it } from "vitest"

import {
  SOURCE_IDS,
  SOURCES,
  availableSources,
  connectedSources,
  findSourceById,
  homeSourceRows,
  listSourceCatalogEntries,
  sourceStatusLabel,
  type DataSource,
  type SourceId,
} from "./sources"

describe("sources", () => {
  it("exposes the complete typed source id list from the catalog", () => {
    const ids: SourceId[] = SOURCE_IDS

    expect(ids).toEqual(listSourceCatalogEntries().map((source) => source.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("groups connected and available source catalog entries", () => {
    expect(connectedSources().map((source) => source.id)).toEqual([])
    expect(availableSources().map((source) => source.id)).toEqual([
      "imap",
      "csv",
      "forms",
      "stripe",
      "mailerlite",
      "calendly",
      "teachable",
    ])
  })

  it("uses a named summary stat instead of stat order", () => {
    const source: DataSource = {
      ...SOURCES[0]!,
      connected: true,
      summaryStatId: "synced",
      stats: [
        { id: "events", label: "Events", value: "8,412" },
        { id: "synced", label: "Synced", value: "2m ago" },
      ],
    }

    expect(sourceStatusLabel(source)).toBe("2m ago")
    expect(homeSourceRows([source])[0]?.status).toBe("2m ago")
  })

  it("keeps unavailable sources explicit", () => {
    expect(
      sourceStatusLabel(SOURCES.find((source) => source.id === "stripe")!)
    ).toBe("Not connected")
  })

  it("declares an auth strategy on every source", () => {
    for (const source of SOURCES) {
      expect(source.auth).toMatch(/^(oauth|apikey|imap|csv)$/)
      expect(source.category).toBeTruthy()
    }
  })

  it("flags MailerLite as new and apikey-authed", () => {
    const mailerlite = findSourceById("mailerlite")
    expect(mailerlite).not.toBeNull()
    expect(mailerlite?.isNew).toBe(true)
    expect(mailerlite?.auth).toBe("apikey")
  })

  it("returns null for unknown source ids", () => {
    expect(findSourceById("does-not-exist")).toBeNull()
  })
})
