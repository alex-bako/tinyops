import { describe, expect, it } from "vitest"

import { createSourcesPageView } from "@/app/(app)/home/sources/_view-model"

import { createMockSourceCatalogRepository } from "./mock-repository"

describe("mock source catalog repository", () => {
  it("lists data sources for grouping view models", async () => {
    const repository = createMockSourceCatalogRepository()
    const view = createSourcesPageView(await repository.listDataSources())

    expect(view.connected.count).toBe("0")
    expect(view.available.count).toBe("7")
  })

  it("finds a data source by id and returns null when missing", async () => {
    const repository = createMockSourceCatalogRepository()

    await expect(repository.findDataSourceById("imap")).resolves.toMatchObject({
      id: "imap",
      auth: "imap",
    })
    await expect(
      repository.findDataSourceById("not-a-source")
    ).resolves.toBeNull()
  })

  it("resolves source titles for navigation without exposing catalog storage", async () => {
    const repository = createMockSourceCatalogRepository()

    await expect(repository.resolveSourceTitle("imap")).resolves.toBe(
      "IMAP mailbox"
    )
    await expect(repository.resolveSourceTitle("missing")).resolves.toBeUndefined()
  })
})
