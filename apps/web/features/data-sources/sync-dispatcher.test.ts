import { describe, expect, it } from "vitest"

import {
  dispatchDataSourceSyncWorker,
  MAX_SYNC_CHAIN,
  nextSyncChainStep,
} from "@/features/data-sources/sync-dispatcher"
import type { DataSourceSyncWorkerResult } from "@/features/data-sources/sync-worker"

const truncatedResult: DataSourceSyncWorkerResult = {
  claimed: true,
  sourceId: "source_1",
  workspaceId: "workspace_1",
  persisted: { clients: 1, rawRecords: 1, timelineEvents: 1 },
  truncated: true,
}

describe("nextSyncChainStep", () => {
  it("continues draining with an incremented chain when the source is truncated", () => {
    expect(nextSyncChainStep(truncatedResult, 0)).toEqual({
      dispatch: true,
      chain: 1,
    })
    expect(nextSyncChainStep(truncatedResult, 4)).toEqual({
      dispatch: true,
      chain: 5,
    })
  })

  it("stops when the source is fully drained", () => {
    expect(
      nextSyncChainStep({ ...truncatedResult, truncated: false }, 0)
    ).toEqual({ dispatch: false })
  })

  it("stops when no job was claimed", () => {
    expect(nextSyncChainStep({ claimed: false }, 0)).toEqual({
      dispatch: false,
    })
  })

  it("stops when the run failed", () => {
    expect(
      nextSyncChainStep(
        {
          claimed: true,
          sourceId: "source_1",
          workspaceId: "workspace_1",
          failure: { code: "sync_failed", message: "Sync failed" },
        },
        0
      )
    ).toEqual({ dispatch: false })
  })

  it("stops at the hard chain cap", () => {
    expect(nextSyncChainStep(truncatedResult, MAX_SYNC_CHAIN)).toEqual({
      dispatch: false,
    })
  })
})

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

  it("forwards the chain depth header when continuing a backfill", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []

    await dispatchDataSourceSyncWorker({
      baseUrl: "https://app.example.com",
      secret: "sync-secret",
      chain: 3,
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init })
        return { ok: true, status: 200 }
      },
    })

    expect(calls[0]?.init.headers).toEqual({
      authorization: "Bearer sync-secret",
      "x-sync-chain": "3",
    })
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
