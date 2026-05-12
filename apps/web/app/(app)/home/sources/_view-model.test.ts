import { describe, expect, it } from "vitest"

import type { DataSource } from "@/lib/sources"
import { createSourcesPageView } from "./_view-model"

describe("sources page view", () => {
  it("builds connected and available sections from the source catalog", () => {
    const view = createSourcesPageView()

    expect(view.connected.count).toBe("0")
    expect(view.available.count).toBe("7")
    expect(view.available.rows.map((source) => source.id)).toEqual([
      "imap",
      "csv",
      "forms",
      "stripe",
      "mailerlite",
      "calendly",
      "teachable",
    ])
    expect(
      view.available.rows.every((source) => source.action === "connect")
    ).toBe(true)
    expect(view.available.rows.map((source) => source.href)).toEqual([
      "/home/sources/imap/new",
      "/home/sources/csv/new",
      "/home/sources/forms/new",
      "/home/sources/stripe/new",
      "/home/sources/mailerlite/new",
      "/home/sources/calendly/new",
      "/home/sources/teachable/new",
    ])
    expect(view.connected).not.toHaveProperty("hasActiveSync")
    expect(view.connected).not.toHaveProperty("syncStateKey")
  })

  it("keeps connected source actions and unavailable labels explicit", () => {
    const view = createSourcesPageView()

    expect(view.available.rows[0]).toMatchObject({
      id: "imap",
      action: "connect",
      href: "/home/sources/imap/new",
      primaryLabel: "Connect",
      configureLabel: "Configure IMAP mailbox",
      statusLabel: "Not connected",
    })
    expect(view.available.rows[3]).toMatchObject({
      id: "stripe",
      action: "connect",
      href: "/home/sources/stripe/new",
      primaryLabel: "Connect",
      configureLabel: "Configure Stripe",
      statusLabel: "Not connected",
    })
  })

  it("links each connected connector instance to its stable slug page", () => {
    const view = createSourcesPageView([
      {
        id: "forms",
        icon: "clipboard-list",
        title: "Google Forms",
        sub: "2 forms connected",
        category: "Forms",
        auth: "multi",
        kind: "data_source",
        connected: true,
        sourceId: "forms_source_1",
        sourceType: "forms",
        sourceSlug: "practice-intake",
        health: "healthy",
        lastSync: "ready",
        summaryStatId: "events",
        stats: [{ id: "events", label: "Forms", value: "2" }],
        forms: { connections: [] },
      } as DataSource,
    ])

    expect(view.connected.rows[0]).toMatchObject({
      id: "forms",
      sourceId: "forms_source_1",
      sourceType: "forms",
      sourceSlug: "practice-intake",
      href: "/home/sources/forms/practice-intake",
      action: "sync",
      primaryLabel: "Sync",
    })
    expect(view.connected.rows[0]).not.toHaveProperty("sourceRowId")
    expect(view.connected.rows[0]).not.toHaveProperty("sourceRowIds")
  })
})
