import { describe, expect, it } from "vitest"

import { createWorkspaceClientMemoryRepository } from "@/features/clients/application/client-memory"
import type {
  ClientListRow,
  ClientProfile,
  ClientReaderPort,
} from "@/features/clients/domain/client-profile"

const profile: ClientProfile = {
  id: "client_1",
  workspaceId: "workspace_1",
  primaryEmail: "anna@example.com",
  displayName: "Anna Smith",
  slug: "anna-smith",
  status: "active",
  tags: ["March cohort"],
  firstSeenAt: "2026-02-10T00:00:00.000Z",
  lastSeenAt: "2026-05-07T08:00:00.000Z",
  lastContactedAt: "2026-05-07T08:00:00.000Z",
  doNotContact: false,
  unsubscribeStatus: "subscribed",
  consentStatus: "unknown",
  sensitivityLevel: 0,
  createdAt: "2026-02-10T00:00:00.000Z",
  updatedAt: "2026-05-07T08:00:00.000Z",
  timeline: [],
  properties: [],
  attributes: [],
  sourceIds: [],
}

const listRow: ClientListRow = {
  id: profile.id,
  primaryEmail: profile.primaryEmail,
  displayName: profile.displayName,
  slug: profile.slug,
  status: profile.status,
  tags: profile.tags,
  lastSeenAt: profile.lastSeenAt,
  lastContactedAt: profile.lastContactedAt,
  updatedAt: profile.updatedAt,
  doNotContact: profile.doNotContact,
  sensitivityLevel: profile.sensitivityLevel,
  sourceCount: 2,
  maxTimelineSensitivity: 0,
}

describe("workspace client memory repository", () => {
  it("binds legacy client memory repository calls to the active workspace", async () => {
    const calls: unknown[] = []
    const reader: ClientReaderPort = {
      async listClients(workspaceId) {
        calls.push({ method: "listClients", workspaceId })
        return [listRow]
      },
      async getRecentClients(workspaceId, limit) {
        calls.push({ method: "getRecentClients", workspaceId, limit })
        return []
      },
      async findClientBySlug(input) {
        calls.push({ method: "findClientBySlug", ...input })
        return null
      },
      async searchClients() {
        return []
      },
    }

    const repository = createWorkspaceClientMemoryRepository({
      workspaceId: "workspace_1",
      reader,
    })

    await expect(repository.listClients()).resolves.toEqual([
      expect.objectContaining({
        email: "anna@example.com",
        lastContact: "May 7",
        sources: 2,
      }),
    ])
    await repository.getRecentClients(3)
    await repository.findClientBySlug("anna-smith")

    expect(calls).toEqual([
      { method: "listClients", workspaceId: "workspace_1" },
      { method: "getRecentClients", workspaceId: "workspace_1", limit: 3 },
      {
        method: "findClientBySlug",
        workspaceId: "workspace_1",
        slug: "anna-smith",
      },
    ])
  })
})
