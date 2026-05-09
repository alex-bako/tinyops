import { describe, expect, it } from "vitest"

import { clientBySlug } from "@/lib/clients"

import { createClientDetailView } from "./_view-model"

describe("client detail view model", () => {
  it("derives header badges from client state", () => {
    const client = clientBySlug("anna-smith")!
    const view = createClientDetailView(client)

    expect(view.header.badges.map((badge) => badge.label)).toEqual([
      "Active",
      "March cohort",
      "Overdue check-in",
    ])
  })

  it("formats memory confidence for display", () => {
    const client = clientBySlug("anna-smith")!
    const view = createClientDetailView(client)

    expect(view.memory.confidencePct).toBe(78)
    expect(view.memory.confidenceWidth).toBe("78%")
  })

  it("maps timeline source labels and tones", () => {
    const client = clientBySlug("anna-smith")!
    const view = createClientDetailView(client)

    expect(view.timeline[0]).toMatchObject({
      tone: "brand",
      sourceLabel: "email",
    })
    expect(view.timeline[1]).toMatchObject({
      tone: "positive",
      sourceLabel: "form · sensitive",
      sensitive: true,
    })
  })

  it("computes detail section counts", () => {
    const client = clientBySlug("anna-smith")!
    const view = createClientDetailView(client)

    expect(view.propertiesCount).toBe("10 fields")
    expect(view.timelineCount).toBe("9 events · 5 shown")
  })
})
