import { describe, expect, it, vi } from "vitest"

import { createGmailConnector } from "@/features/data-sources/gmail/gmail-sync"
import type {
  GmailApiClient,
  GmailRawMessage,
} from "@/features/data-sources/gmail/gmail-api-client"
import type { GmailDataSource } from "@/features/data-sources/types"

function rawMessage(
  id: string,
  overrides: Partial<GmailRawMessage> & { from?: string; to?: string; messageId?: string } = {}
): GmailRawMessage {
  const from = overrides.from ?? "Client <client@acme.test>"
  const to = overrides.to ?? "owner@gmail.com"
  const messageId = overrides.messageId ?? `<${id}@acme.test>`
  const rfc822 = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: Subject ${id}`,
    `Message-ID: ${messageId}`,
    "Date: Mon, 02 Feb 2026 10:00:00 +0000",
    "",
    `Body of ${id}`,
    "",
  ].join("\r\n")
  return {
    id,
    threadId: overrides.threadId ?? `t-${id}`,
    labelIds: overrides.labelIds ?? ["INBOX"],
    internalDate: overrides.internalDate ?? "1770026400000",
    raw: Buffer.from(rfc822).toString("base64url"),
  }
}

function gmailSource(overrides: Partial<GmailDataSource> = {}): GmailDataSource {
  return {
    id: "source_1",
    workspaceId: "workspace_1",
    type: "gmail",
    sourceSlug: "primary-gmail",
    displayName: "Primary Gmail",
    status: "connected",
    configVersion: 1,
    connection: { emailAddress: "owner@gmail.com" },
    intake: {
      historyWindow: "90d",
      watchedFolders: ["INBOX"],
      skipSenders: [],
      messageFilters: { mode: "and", rules: [] },
    },
    folderSnapshot: { availableFolders: [] },
    secret: { purpose: "gmail_oauth_refresh_token", maskedValue: "****oken" },
    sync: { status: "queued", cursor: null, lastError: null, lastSyncedAt: null },
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  }
}

function fakeClient(overrides: Partial<GmailApiClient> = {}): GmailApiClient {
  return {
    getProfile: vi.fn().mockResolvedValue({ emailAddress: "owner@gmail.com", historyId: "1000" }),
    listLabels: vi.fn().mockResolvedValue([]),
    listMessages: vi.fn(),
    getMessageRaw: vi.fn(),
    listHistory: vi.fn(),
    ...overrides,
  }
}

function connector(client: GmailApiClient, source: GmailDataSource) {
  return createGmailConnector({
    source,
    accessToken: "access-1",
    apiClientFactory: () => client,
    sleep: async () => {},
    now: new Date("2026-06-15T00:00:00.000Z"),
  })
}

describe("createGmailConnector backfill", () => {
  it("returns a page of records and a backfill cursor while more pages remain", async () => {
    const client = fakeClient({
      listMessages: vi.fn().mockResolvedValue({
        messages: [{ id: "m1", threadId: "t1" }],
        nextPageToken: "page-2",
        resultSizeEstimate: 2,
      }),
      getMessageRaw: vi.fn().mockResolvedValue(rawMessage("m1")),
    })

    const result = await connector(client, gmailSource()).sync({
      workspaceId: "workspace_1",
      sourceId: "source_1",
    })

    expect(result.records).toHaveLength(1)
    expect(result.records[0]?.sourceType).toBe("gmail")
    expect(result.records[0]?.externalId).toBe("message:<m1@acme.test>")
    expect(result.truncated).toBe(true)
    expect(result.cursor).toMatchObject({
      phase: "backfill",
      pageToken: "page-2",
      baselineHistoryId: "1000",
    })
  })

  it("hands off to the incremental phase when backfill drains", async () => {
    const client = fakeClient({
      listMessages: vi.fn().mockResolvedValue({
        messages: [{ id: "m1", threadId: "t1" }],
        nextPageToken: null,
        resultSizeEstimate: 1,
      }),
      getMessageRaw: vi.fn().mockResolvedValue(rawMessage("m1")),
    })

    const result = await connector(client, gmailSource()).sync({
      workspaceId: "workspace_1",
      sourceId: "source_1",
    })

    expect(result.truncated).toBe(false)
    expect(result.cursor).toEqual({ phase: "incremental", historyId: "1000" })
  })

  it("post-filters by watched labels when multiple labels are watched", async () => {
    const source = gmailSource({
      intake: {
        historyWindow: "90d",
        watchedFolders: ["INBOX", "SENT"],
        skipSenders: [],
        messageFilters: { mode: "and", rules: [] },
      },
    })
    const client = fakeClient({
      listMessages: vi.fn().mockResolvedValue({
        messages: [{ id: "keep", threadId: "t1" }, { id: "drop", threadId: "t2" }],
        nextPageToken: null,
        resultSizeEstimate: 2,
      }),
      getMessageRaw: vi.fn(async (id: string) =>
        id === "keep"
          ? rawMessage("keep", { labelIds: ["SENT"] })
          : rawMessage("drop", { labelIds: ["SPAM"] })
      ),
    })

    const result = await connector(client, source).sync({
      workspaceId: "workspace_1",
      sourceId: "source_1",
    })

    expect(result.records.map((r) => r.metadata)).toHaveLength(1)
    // listMessages called without labelIds (AND-semantics avoidance)
    expect(client.listMessages).toHaveBeenCalledWith(
      expect.objectContaining({ labelIds: undefined })
    )
  })
})

describe("createGmailConnector incremental", () => {
  it("fetches added messages and advances the historyId", async () => {
    const source = gmailSource({
      sync: { status: "idle", cursor: { phase: "incremental", historyId: "1000" }, lastError: null, lastSyncedAt: "2026-06-14T00:00:00.000Z" },
    })
    const client = fakeClient({
      listHistory: vi.fn().mockResolvedValue({
        addedMessageIds: ["m9"],
        nextPageToken: null,
        historyId: "1050",
      }),
      getMessageRaw: vi.fn().mockResolvedValue(rawMessage("m9")),
    })

    const result = await connector(client, source).sync({
      workspaceId: "workspace_1",
      sourceId: "source_1",
    })

    expect(result.records).toHaveLength(1)
    expect(result.cursor).toEqual({ phase: "incremental", historyId: "1050" })
    expect(client.listHistory).toHaveBeenCalledWith(
      expect.objectContaining({ startHistoryId: "1000" })
    )
  })

  it("falls back to a bounded re-backfill when history has expired (404)", async () => {
    const source = gmailSource({
      sync: { status: "idle", cursor: { phase: "incremental", historyId: "1" }, lastError: null, lastSyncedAt: "2026-06-05T00:00:00.000Z" },
    })
    const historyError = Object.assign(new Error("not found"), { code: 404 })
    const listMessages = vi.fn().mockResolvedValue({
      messages: [{ id: "m1", threadId: "t1" }],
      nextPageToken: null,
      resultSizeEstimate: 1,
    })
    const client = fakeClient({
      listHistory: vi.fn().mockRejectedValue(historyError),
      listMessages,
      getMessageRaw: vi.fn().mockResolvedValue(rawMessage("m1")),
    })

    const result = await connector(client, source).sync({
      workspaceId: "workspace_1",
      sourceId: "source_1",
    })

    expect(result.records).toHaveLength(1)
    expect(listMessages).toHaveBeenCalledWith(
      expect.objectContaining({ q: "newer_than:11d" })
    )
    expect(result.cursor).toEqual({ phase: "incremental", historyId: "1000" })
  })
})

describe("createGmailConnector rate limiting", () => {
  it("retries getMessageRaw with backoff on a rate-limit error", async () => {
    const rateError = Object.assign(new Error("rate"), { code: 429 })
    const getMessageRaw = vi
      .fn()
      .mockRejectedValueOnce(rateError)
      .mockResolvedValueOnce(rawMessage("m1"))
    const client = fakeClient({
      listMessages: vi.fn().mockResolvedValue({
        messages: [{ id: "m1", threadId: "t1" }],
        nextPageToken: null,
        resultSizeEstimate: 1,
      }),
      getMessageRaw,
    })

    const result = await connector(client, gmailSource()).sync({
      workspaceId: "workspace_1",
      sourceId: "source_1",
    })

    expect(getMessageRaw).toHaveBeenCalledTimes(2)
    expect(result.records).toHaveLength(1)
  })
})
