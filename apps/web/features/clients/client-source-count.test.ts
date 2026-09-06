import { describe, expect, it } from "vitest"

import { createClientDetail } from "@/features/clients/application/client-memory"
import type { ClientProfile } from "@/features/clients/domain/client-profile"

const BASE: ClientProfile = {
  id: "client_1",
  workspaceId: "workspace_1",
  primaryEmail: "laszlo@example.com",
  displayName: "László",
  slug: "laszlo",
  status: "active",
  tags: [],
  firstSeenAt: null,
  lastSeenAt: null,
  lastContactedAt: null,
  doNotContact: false,
  unsubscribeStatus: "subscribed",
  consentStatus: "granted",
  sensitivityLevel: 0,
  createdAt: "2026-09-06T11:00:00.000Z",
  updatedAt: "2026-09-06T11:00:00.000Z",
  timeline: [],
  properties: [],
  attributes: [],
  sourceIds: [],
}

describe("client source count", () => {
  it("counts a source that imported the client without emitting any timeline event", () => {
    const detail = createClientDetail({ ...BASE, sourceIds: ["source_mailerlite"] })

    expect(detail.timeline).toHaveLength(0)
    expect(detail.sources).toBe(1)
  })

  it("does not double-count a source that also produced timeline events", () => {
    const detail = createClientDetail({
      ...BASE,
      sourceIds: ["source_mailerlite"],
      timeline: [
        {
          id: "event_1",
          sourceId: "source_mailerlite",
          sourceType: "mailerlite",
          type: "engagement",
          occurredAt: "2026-09-06T11:00:00.000Z",
          display: { title: "Opened · Newsletter", summary: "" },
          body: { text: "", blocks: [] },
          sensitivityLevel: 0,
          parentEventId: null,
          author: null,
        },
      ],
    })

    expect(detail.sources).toBe(1)
  })
})
