import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createDataSourceSyncRuntime: vi.fn(),
  runNext: vi.fn(),
}))

vi.mock("@/lib/supabase/server-env", () => ({
  getSyncWorkerSecret: () => "sync-secret",
}))

vi.mock("@/features/data-sources/adapters/sync-runtime", () => ({
  createDataSourceSyncRuntime: mocks.createDataSourceSyncRuntime,
}))

import { POST } from "./route"

function syncRequest() {
  return new Request("https://app.example.com/api/sync/run", {
    method: "POST",
    headers: { authorization: "Bearer sync-secret" },
  })
}

describe("sync run route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createDataSourceSyncRuntime.mockReturnValue({
      runNext: mocks.runNext,
    })
  })

  it("rejects requests without the worker bearer secret", async () => {
    const response = await POST(
      new Request("https://app.example.com/api/sync/run", {
        method: "POST",
        headers: { authorization: "Bearer wrong" },
      })
    )

    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(response.status).toBe(401)
    expect(mocks.createDataSourceSyncRuntime).not.toHaveBeenCalled()
    expect(mocks.runNext).not.toHaveBeenCalled()
  })

  it("returns idle when no sync job is claimable", async () => {
    mocks.runNext.mockResolvedValue({ claimed: false })

    const response = await POST(syncRequest())

    await expect(response.json()).resolves.toEqual({ status: "idle" })
    expect(response.status).toBe(200)
    expect(mocks.createDataSourceSyncRuntime).toHaveBeenCalledTimes(1)
    expect(mocks.runNext).toHaveBeenCalledWith({ trigger: "immediate" })
  })

  it("returns succeeded when a claimed sync completes", async () => {
    mocks.runNext.mockResolvedValue({
      claimed: true,
      sourceId: "source_1",
      workspaceId: "workspace_1",
      persisted: { clients: 1, rawRecords: 2, timelineEvents: 3 },
      truncated: false,
    })

    const response = await POST(syncRequest())

    await expect(response.json()).resolves.toEqual({
      status: "succeeded",
      sourceId: "source_1",
      workspaceId: "workspace_1",
      persisted: { clients: 1, rawRecords: 2, timelineEvents: 3 },
      truncated: false,
    })
    expect(response.status).toBe(200)
  })

  it("returns 500 and logs safe context for claimed sync failures", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)
    mocks.runNext.mockResolvedValue({
      claimed: true,
      sourceId: "source_1",
      workspaceId: "workspace_1",
      failure: {
        code: "secret_read_failed",
        message: "Could not read IMAP password",
        sourceId: "source_1",
        workspaceId: "workspace_1",
        cause: new Error("PGRST106 Invalid schema: vault"),
      },
    })

    const response = await POST(syncRequest())

    await expect(response.json()).resolves.toEqual({
      status: "failed",
      code: "secret_read_failed",
      message: "Could not read IMAP password",
      sourceId: "source_1",
    })
    expect(response.status).toBe(500)
    expect(consoleError).toHaveBeenCalledWith("data_source_sync_failed", {
      code: "secret_read_failed",
      message: "Could not read IMAP password",
      sourceId: "source_1",
      workspaceId: "workspace_1",
      causeMessage: "PGRST106 Invalid schema: vault",
    })
    consoleError.mockRestore()
  })
})
