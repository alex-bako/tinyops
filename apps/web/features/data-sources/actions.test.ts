import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ImapDataSource } from "@/features/data-sources/types"

const mocks = vi.hoisted(() => ({
  afterCallbacks: [] as Array<() => unknown>,
  createDataSourceServerContext: vi.fn(),
  createImapFlowConnectionTester: vi.fn(),
  createSupabaseImapSecretReader: vi.fn(() => ({
    readImapPassword: vi.fn(),
    readImapPasswordForSync: vi.fn(),
  })),
  dispatchDataSourceSyncWorker: vi.fn(),
  logWarn: vi.fn(),
  requestHeaders: new Headers({
    host: "app.example.com",
    "x-forwarded-proto": "https",
  }),
  revalidatePath: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("next/headers", () => ({
  headers: async () => mocks.requestHeaders,
}))

vi.mock("next/server", () => ({
  after: (callback: () => unknown) => {
    mocks.afterCallbacks.push(callback)
  },
}))

vi.mock("@/features/data-sources/loaders", () => ({
  createDataSourceServerContext: mocks.createDataSourceServerContext,
}))

vi.mock("@/features/data-sources/imap-connection-tester", () => ({
  createImapFlowConnectionTester: mocks.createImapFlowConnectionTester,
}))

vi.mock("@/features/data-sources/imap-secret-reader", () => ({
  createSupabaseImapSecretReader: mocks.createSupabaseImapSecretReader,
}))

vi.mock("@/features/data-sources/sync-dispatcher", () => ({
  dispatchDataSourceSyncWorker: mocks.dispatchDataSourceSyncWorker,
}))

vi.mock("@/lib/logging", () => ({
  getLogger: () => ({
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: mocks.logWarn,
      error: vi.fn(),
    }),
  }),
}))

vi.mock("@/lib/supabase/server-env", () => ({
  getOptionalTinyOpsAppBaseUrl: () => "https://app.example.com",
  getOptionalSyncWorkerSecret: () => "sync-secret",
}))

import {
  connectImapDataSourceAction,
  requestAllDataSourceSyncsAction,
  requestDataSourceSyncAction,
} from "@/features/data-sources/actions"

function imapSource(): ImapDataSource {
  return {
    id: "source_1",
    workspaceId: "workspace_1",
    type: "imap",
    displayName: "IMAP mailbox",
    status: "connected",
    configVersion: 1,
    connection: {
      host: "imap.example.com",
      port: 993,
      encryption: "ssl",
      username: "owner@example.com",
    },
    intake: {
      historyWindow: "90d",
      watchedFolders: ["INBOX"],
      skipSenders: [],
      messageFilters: { mode: "and", rules: [] },
    },
    folderSnapshot: { availableFolders: [] },
    secret: { purpose: "imap_password", maskedValue: "****cret" },
    sync: {
      status: "queued",
      historyWindow: "90d",
      cursor: null,
      lastError: null,
      lastSyncedAt: null,
    },
    createdAt: "2026-05-10T00:00:00.000Z",
    updatedAt: "2026-05-10T00:00:00.000Z",
  }
}

function store(overrides: Record<string, unknown> = {}) {
  return {
    async listForWorkspace() {
      return []
    },
    async findForWorkspace() {
      return null
    },
    async findByIdForWorkspace() {
      return imapSource()
    },
    async connectImap() {
      return imapSource()
    },
    async updateImapConnection() {
      return imapSource()
    },
    async updateImapIntake() {
      return imapSource()
    },
    async updateImapFolderSnapshot() {
      return imapSource()
    },
    async disconnect() {},
    async requestSync() {},
    async requestAllSyncs() {
      return { queued: 0 }
    },
    ...overrides,
  }
}

describe("data source server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.afterCallbacks.length = 0
    mocks.requestHeaders = new Headers({
      host: "app.example.com",
      "x-forwarded-proto": "https",
    })
    mocks.createImapFlowConnectionTester.mockReturnValue({
      async test() {
        return { folders: [] }
      },
    })
    mocks.createDataSourceServerContext.mockResolvedValue({
      workspace: { id: "workspace_1", role: "owner" },
      store: store(),
    })
    mocks.dispatchDataSourceSyncWorker.mockResolvedValue({
      dispatched: true,
      ok: true,
      status: 200,
    })
  })

  it("schedules immediate worker dispatch after IMAP connect queues initial sync", async () => {
    await expect(
      connectImapDataSourceAction({
        host: "imap.example.com",
        port: 993,
        encryption: "ssl",
        username: "owner@example.com",
        password: "top-secret",
        historyWindow: "90d",
      })
    ).resolves.toMatchObject({ data: { id: "source_1" } })

    expect(mocks.afterCallbacks).toHaveLength(1)
    await mocks.afterCallbacks[0]?.()
    expect(mocks.dispatchDataSourceSyncWorker).toHaveBeenCalledWith({
      baseUrl: "https://app.example.com",
      secret: "sync-secret",
    })
  })

  it("schedules immediate worker dispatch after explicit sync requests", async () => {
    const requestSync = vi.fn(async () => undefined)
    mocks.createDataSourceServerContext.mockResolvedValue({
      workspace: { id: "workspace_1", role: "owner" },
      store: store({ requestSync }),
    })

    await expect(requestDataSourceSyncAction("source_1")).resolves.toEqual({
      data: undefined,
    })

    expect(requestSync).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      sourceId: "source_1",
    })
    expect(mocks.afterCallbacks).toHaveLength(1)
  })

  it("queues every configured data source from sync all and schedules one dispatch", async () => {
    const requestAllSyncs = vi.fn(async () => ({ queued: 2 }))
    mocks.createDataSourceServerContext.mockResolvedValue({
      workspace: { id: "workspace_1", role: "owner" },
      store: store({
        requestAllSyncs,
      }),
    })

    await expect(requestAllDataSourceSyncsAction()).resolves.toEqual({
      data: { queued: 2 },
    })

    expect(requestAllSyncs).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
    })
    expect(mocks.afterCallbacks).toHaveLength(1)
  })

  it("keeps queued state when immediate dispatch fails", async () => {
    mocks.dispatchDataSourceSyncWorker.mockRejectedValue(new Error("network down"))

    await expect(requestDataSourceSyncAction("source_1")).resolves.toEqual({
      data: undefined,
    })
    await expect(mocks.afterCallbacks[0]?.()).resolves.toBeUndefined()
    expect(mocks.logWarn).toHaveBeenCalledWith(
      {
        event: "data_source_sync_dispatch_failed",
        message: "network down",
      },
      "data source sync dispatch failed"
    )
  })

  it("uses the trusted app base URL instead of request host headers for dispatch", async () => {
    mocks.requestHeaders = new Headers({
      host: "attacker.example",
      "x-forwarded-host": "attacker.example",
      "x-forwarded-proto": "https",
    })

    await expect(requestDataSourceSyncAction("source_1")).resolves.toEqual({
      data: undefined,
    })
    await mocks.afterCallbacks[0]?.()

    expect(mocks.dispatchDataSourceSyncWorker).toHaveBeenCalledWith({
      baseUrl: "https://app.example.com",
      secret: "sync-secret",
    })
  })
})
