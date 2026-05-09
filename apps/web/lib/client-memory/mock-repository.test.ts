import { describe, expect, it } from "vitest"

import { createSourcesPageView } from "@/app/(app)/home/sources/_view-model"
import { createMockClientMemoryRepository } from "@/lib/client-memory/mock-repository"

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

  it("lists data sources for grouping view models", async () => {
    const repository = createMockClientMemoryRepository()
    const view = createSourcesPageView(await repository.listDataSources())

    expect(view.connected.count).toBe("3")
    expect(view.available.count).toBe("3")
  })
})
