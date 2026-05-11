import { describe, expect, it } from "vitest"

import { createClientQueryApplication } from "@/features/clients/application/client-query"
import type { ClientReaderPort } from "@/features/clients/domain/client-profile"

describe("client query application", () => {
  it("searches client profiles by normalized query within the active workspace", async () => {
    const calls: unknown[] = []
    const reader: ClientReaderPort = {
      async listClients() {
        throw new Error("unexpected list")
      },
      async getRecentClients() {
        throw new Error("unexpected recent")
      },
      async findClientBySlug() {
        throw new Error("unexpected detail")
      },
      async searchClients(input) {
        calls.push(input)
        return [
          {
            id: "client_1",
            slug: "anna-smith",
            name: "Anna Smith",
            email: "anna@example.com",
            lastInteractionAt: "2026-05-07T08:00:00.000Z",
            sourceCount: 2,
          },
        ]
      },
    }

    const application = createClientQueryApplication({
      workspaceId: "workspace_1",
      reader,
    })

    await expect(application.searchClients(" Anna@Example ")).resolves.toEqual([
      expect.objectContaining({ email: "anna@example.com" }),
    ])
    expect(calls).toEqual([
      { workspaceId: "workspace_1", query: "anna@example", limit: 8 },
    ])
  })

  it("does not query storage for empty search input", async () => {
    const application = createClientQueryApplication({
      workspaceId: "workspace_1",
      reader: {
        async listClients() {
          return []
        },
        async getRecentClients() {
          return []
        },
        async findClientBySlug() {
          return null
        },
        async searchClients() {
          throw new Error("empty search should not hit reader")
        },
      },
    })

    await expect(application.searchClients(" ")).resolves.toEqual([])
  })
})
