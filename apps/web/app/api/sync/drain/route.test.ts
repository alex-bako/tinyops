import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createDataSourceSyncRuntime: vi.fn(),
  runBatch: vi.fn(),
}))

vi.mock("@/lib/supabase/server-env", () => ({
  getCronSecret: () => "cron-secret",
}))

vi.mock("@/features/data-sources/adapters/sync-runtime", () => ({
  createDataSourceSyncRuntime: mocks.createDataSourceSyncRuntime,
}))

import { GET } from "./route"

function cronRequest(secret = "cron-secret") {
  return new Request("https://app.example.com/api/sync/drain", {
    method: "GET",
    headers: { authorization: `Bearer ${secret}` },
  })
}

describe("sync drain cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createDataSourceSyncRuntime.mockReturnValue({
      runBatch: mocks.runBatch,
    })
  })

  it("rejects requests without the cron bearer secret", async () => {
    const response = await GET(cronRequest("wrong"))

    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(response.status).toBe(401)
    expect(mocks.createDataSourceSyncRuntime).not.toHaveBeenCalled()
    expect(mocks.runBatch).not.toHaveBeenCalled()
  })

  it("drains a capped batch and returns 200 even when claimed jobs fail", async () => {
    mocks.runBatch.mockResolvedValue({
      claimed: 3,
      succeeded: 2,
      failed: 1,
      results: [
        { claimed: true, sourceId: "source_1", workspaceId: "workspace_1" },
        {
          claimed: true,
          sourceId: "source_2",
          workspaceId: "workspace_1",
          failure: {
            code: "ingestion_failed",
            message: "Could not persist synced records",
          },
        },
        { claimed: true, sourceId: "source_3", workspaceId: "workspace_1" },
      ],
    })

    const response = await GET(cronRequest())

    await expect(response.json()).resolves.toEqual({
      status: "drained",
      claimed: 3,
      succeeded: 2,
      failed: 1,
    })
    expect(response.status).toBe(200)
    expect(mocks.createDataSourceSyncRuntime).toHaveBeenCalledTimes(1)
    expect(mocks.runBatch).toHaveBeenCalledWith({
      trigger: "cron",
      maxJobs: 50,
    })
  })
})
