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
    expect(view.available.rows.every((source) => source.action === "connect")).toBe(
      true
    )
    expect(view.available.rows.map((source) => source.href)).toEqual([
      "/home/sources/imap",
      "/home/sources/csv",
      "/home/sources/forms",
      "/home/sources/stripe",
      "/home/sources/mailerlite",
      "/home/sources/calendly",
      "/home/sources/teachable",
    ])
    expect(view.connected).not.toHaveProperty("hasActiveSync")
    expect(view.connected).not.toHaveProperty("syncStateKey")
  })

  it("keeps connected source actions and unavailable labels explicit", () => {
    const view = createSourcesPageView()

    expect(view.available.rows[0]).toMatchObject({
      id: "imap",
      action: "connect",
      href: "/home/sources/imap",
      primaryLabel: "Connect",
      configureLabel: "Configure IMAP mailbox",
      statusLabel: "Not connected",
    })
    expect(view.available.rows[3]).toMatchObject({
      id: "stripe",
      action: "connect",
      href: "/home/sources/stripe",
      primaryLabel: "Connect",
      configureLabel: "Configure Stripe",
      statusLabel: "Not connected",
    })
  })

  it("carries all connected row ids and uses manage intent for plural connectors", () => {
    const view = createSourcesPageView([
      {
        id: "forms",
        icon: "clipboard-list",
        title: "Google Forms",
        sub: "2 forms connected",
        category: "Forms",
        auth: "multi",
        cardinality: "plural",
        connected: true,
        sourceRowIds: ["forms_source_2", "forms_source_1"],
        stats: [{ id: "events", label: "Forms", value: "2" }],
        forms: { connections: [] },
      } satisfies DataSource,
    ])

    expect(view.connected.rows[0]).toMatchObject({
      id: "forms",
      sourceRowIds: ["forms_source_2", "forms_source_1"],
      action: "manage",
      primaryLabel: "Manage",
    })
  })
})
