import { describe, expect, it } from "vitest"

import { dispatchDataSourceSyncWorker } from "@/features/data-sources/sync-dispatcher"

describe("data source sync dispatcher", () => {
  it("posts to the worker endpoint with the configured bearer secret", async () => {
    const calls: unknown[] = []

    await expect(
      dispatchDataSourceSyncWorker({
        baseUrl: "https://app.example.com",
        secret: "sync-secret",
        fetcher: async (url, init) => {
          calls.push({ url: String(url), init })
          return { ok: true, status: 200 }
        },
      })
    ).resolves.toEqual({ dispatched: true, ok: true, status: 200 })

    expect(calls).toEqual([
      {
        url: "https://app.example.com/api/sync/run",
        init: {
          method: "POST",
          headers: { authorization: "Bearer sync-secret" },
          cache: "no-store",
        },
      },
    ])
  })

  it("skips dispatch when worker secret or origin is unavailable", async () => {
    await expect(
      dispatchDataSourceSyncWorker({
        baseUrl: null,
        secret: "sync-secret",
        fetcher: async () => {
          throw new Error("should not fetch")
        },
      })
    ).resolves.toEqual({ dispatched: false })
  })
})
