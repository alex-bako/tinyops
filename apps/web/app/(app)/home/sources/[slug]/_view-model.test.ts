import { describe, expect, it } from "vitest"

import { findSourceById, type DataSource } from "@/lib/sources"

import { createSourceDetailView } from "./_view-model"
import { getSourceUi } from "./source-registry"

describe("source detail view", () => {
  it("describes a healthy connected source with sync timing", () => {
    const source: DataSource = {
      ...findSourceById("imap")!,
      connected: true,
      health: "healthy",
      lastSync: "queued",
      summaryStatId: "synced",
      stats: [{ id: "synced", label: "Sync", value: "Queued" }],
    }
    const view = createSourceDetailView(source, getSourceUi("imap"))

    expect(view.connected).toBe(true)
    expect(view.connection.auth).toBe("imap")
    expect(view.connection.sourceId).toBe("imap")
    expect(view.config.sourceId).toBe("imap")
    expect(view.actions).toEqual({ canDisconnect: true, canSync: true })
    expect(view.header.logoClassName).toContain("cobalt")
    expect(view.header.status).toEqual({
      variant: "ok",
      label: "Connected · queued",
    })
    expect(view.activity).toEqual([])
  })

  it("flags a stale connected source as warn", () => {
    const source: DataSource = {
      ...findSourceById("csv")!,
      connected: true,
      health: "stale",
      lastSync: "3 days ago",
      stats: [],
    }
    const view = createSourceDetailView(source, getSourceUi("csv"))

    expect(view.header.status).toEqual({
      variant: "warn",
      label: "Stale · last synced 3 days ago",
    })
  })

  it("describes a disconnected source with empty activity", () => {
    const view = createSourceDetailView(
      findSourceById("stripe")!,
      getSourceUi("stripe")
    )

    expect(view.connected).toBe(false)
    expect(view.connection.auth).toBe("oauth")
    expect(view.actions).toEqual({ canDisconnect: false, canSync: false })
    expect(view.header.status).toEqual({
      variant: "off",
      label: "Not connected",
    })
    expect(view.activity).toEqual([])
  })

  it("propagates the New tag from the catalog", () => {
    const view = createSourceDetailView(
      findSourceById("mailerlite")!,
      getSourceUi("mailerlite")
    )

    expect(view.header.isNew).toBe(true)
    expect(view.connection.auth).toBe("apikey")
  })
})
