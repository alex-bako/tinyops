import { describe, expect, it } from "vitest"

import { createSourcesPageView } from "./_view-model"

describe("sources page view", () => {
  it("builds connected and available sections from the source catalog", () => {
    const view = createSourcesPageView()

    expect(view.connected.count).toBe("3")
    expect(view.available.count).toBe("3")
    expect(view.connected.rows.map((source) => source.id)).toEqual([
      "imap",
      "csv",
      "forms",
    ])
    expect(view.available.rows.map((source) => source.action)).toEqual([
      "connect",
      "connect",
      "connect",
    ])
  })

  it("keeps connected source actions and unavailable labels explicit", () => {
    const view = createSourcesPageView()

    expect(view.connected.rows[0]).toMatchObject({
      id: "imap",
      action: "sync",
      statusLabel: "2m ago",
    })
    expect(view.available.rows[0]).toMatchObject({
      id: "stripe",
      action: "connect",
      statusLabel: "Not connected",
    })
  })
})
