import { describe, expect, it } from "vitest"

import { createMockClientMemoryRepository } from "@/features/clients/adapters/mock-client-memory"

describe("mock client memory repository", () => {
  it("lists clients and recent clients from the mock data adapter", async () => {
    const repository = createMockClientMemoryRepository()

    await expect(repository.listClients()).resolves.toHaveLength(20)
    await expect(repository.getRecentClients(2)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "anna-smith" }),
        expect.objectContaining({ slug: "mariko-tan" }),
      ])
    )
  })

  it("returns null for a missing client detail lookup", async () => {
    const repository = createMockClientMemoryRepository()

    await expect(repository.findClientBySlug("missing")).resolves.toBeNull()
  })

})
