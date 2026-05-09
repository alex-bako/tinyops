import { describe, expect, it } from "vitest"

import {
  SOURCES,
  connectedSources,
  homeSourceRows,
  sourceStatusLabel,
  type DataSource,
} from "./sources"

describe("sources", () => {
  it("groups connected and available source catalog entries", () => {
    expect(connectedSources().map((source) => source.id)).toEqual([
      "imap",
      "csv",
      "forms",
    ])
  })

  it("uses a named summary stat instead of stat order", () => {
    const source: DataSource = {
      ...SOURCES[0]!,
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
    expect(sourceStatusLabel(SOURCES.find((source) => source.id === "stripe")!)).toBe(
      "Not connected"
    )
  })
})
