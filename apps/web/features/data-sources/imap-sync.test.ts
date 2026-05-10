import { describe, expect, it } from "vitest"

import { createImapConnector } from "@/features/data-sources/imap-sync"
import type { ImapDataSource } from "@/features/data-sources/types"

const rawReplayEmail = [
  "Message-ID: <m1@example.com>",
  "From: Anna Smith <anna@example.com>",
  "To: Owner <owner@example.com>",
  "Subject: Replay access",
  "Date: Thu, 7 May 2026 08:00:00 +0000",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Could you resend the replay library link?",
].join("\r\n")

const rawNoreplyEmail = [
  "Message-ID: <m2@example.com>",
  "From: Notifications <notifications@example.com>",
  "To: Owner <owner@example.com>",
  "Subject: Replay receipt",
  "Date: Thu, 7 May 2026 09:00:00 +0000",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Automated receipt",
].join("\r\n")

const rawSensitiveGroupEmail = [
  "From: Owner <owner@example.com>",
  "To: Anna Smith <anna@example.com>, Priya <priya@example.com>",
  "Subject: Checking in",
  "Date: Fri, 8 May 2026 10:00:00 +0000",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "This mentions trauma context.",
].join("\r\n")

const rawNoDateEmail = [
  "Message-ID: <m3@example.com>",
  "From: Anna Smith <anna@example.com>",
  "To: Owner <owner@example.com>",
  "Subject: Replay followup",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Could you resend the replay workbook?",
].join("\r\n")

function source(patch: Partial<ImapDataSource> = {}): ImapDataSource {
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
      skipSenders: ["notifications@example.com"],
      messageFilters: {
        mode: "and",
        rules: [
          {
            id: "rule_1",
            field: "subject",
            operator: "contains",
            value: "replay",
          },
        ],
      },
    },
    folderSnapshot: { availableFolders: [{ path: "INBOX", messages: 3 }] },
    secret: { purpose: "imap_password", maskedValue: "****cret" },
    sync: {
      status: "queued",
      historyWindow: "90d",
      cursor: null,
      lastError: null,
      lastSyncedAt: null,
    },
    createdAt: "2026-05-07T00:00:00.000Z",
    updatedAt: "2026-05-07T00:00:00.000Z",
    ...patch,
  }
}

function fakeImapFlow(messages: Record<number, string>) {
  return class FakeImapFlow {
    mailbox = { uidValidity: BigInt(42) }

    constructor(readonly options: unknown) {}

    async connect() {}

    async mailboxOpen(path: string) {
      expect(path).toBe("INBOX")
      return this.mailbox
    }

    async search() {
      return Object.keys(messages).map(Number)
    }

    async *fetch(uids: number[]) {
      for (const uid of uids) {
        yield {
          uid,
          source: Buffer.from(messages[uid]!),
          internalDate: new Date("2026-05-07T08:00:00.000Z"),
        }
      }
    }

    async logout() {}

    close() {}
  }
}

function fakeImapFlowByFolder(messagesByFolder: Record<string, Record<number, string>>) {
  return class FakeImapFlow {
    currentFolder = "INBOX"

    constructor(readonly options: unknown) {}

    async connect() {}

    async mailboxOpen(path: string) {
      this.currentFolder = path
      return { uidValidity: path === "INBOX" ? BigInt(42) : BigInt(84) }
    }

    async search() {
      return Object.keys(messagesByFolder[this.currentFolder] ?? {}).map(Number)
    }

    async *fetch(uids: number[]) {
      const messages = messagesByFolder[this.currentFolder] ?? {}
      for (const uid of uids) {
        yield {
          uid,
          source: Buffer.from(messages[uid]!),
          internalDate: new Date("2026-05-07T08:00:00.000Z"),
        }
      }
    }

    async logout() {}

    close() {}
  }
}

describe("IMAP sync connector", () => {
  it("previews filtered parsed records without raw RFC822 content", async () => {
    const connector = createImapConnector({
      source: source(),
      password: "top-secret",
      ownerEmails: ["owner@example.com"],
      manualReviewKeywords: ["trauma"],
      ImapFlow: fakeImapFlow({
        11: rawReplayEmail,
        12: rawNoreplyEmail,
        13: rawSensitiveGroupEmail,
      }),
      now: new Date("2026-05-10T00:00:00.000Z"),
    })

    const result = await connector.preview({
      workspaceId: "workspace_1",
      sourceId: "source_1",
      limit: 10,
    })

    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({
      externalId: "message:<m1@example.com>",
      eventType: "email_received",
      title: "Replay access",
      bodyText: "Could you resend the replay library link?",
      participants: [{ email: "anna@example.com", role: "external" }],
      sensitivityLevel: 0,
    })
    expect(JSON.stringify(result.records[0])).not.toContain("Message-ID:")
  })

  it("syncs bounded batches and returns a folder cursor", async () => {
    const connector = createImapConnector({
      source: source({
        intake: {
          ...source().intake,
          messageFilters: { mode: "and", rules: [] },
          skipSenders: [],
        },
      }),
      password: "top-secret",
      ownerEmails: ["owner@example.com"],
      manualReviewKeywords: ["trauma"],
      ImapFlow: fakeImapFlow({
        11: rawReplayEmail,
        12: rawSensitiveGroupEmail,
      }),
      now: new Date("2026-05-10T00:00:00.000Z"),
    })

    const result = await connector.sync({
      workspaceId: "workspace_1",
      sourceId: "source_1",
      limit: 1,
    })

    expect(result).toMatchObject({
      records: [expect.objectContaining({ externalId: "message:<m1@example.com>" })],
      truncated: true,
      cursor: {
        folders: {
          INBOX: {
            uidValidity: "42",
            lastUid: 11,
            exhausted: false,
          },
        },
      },
    })
  })

  it("does not advance a later folder cursor past records returned in the batch", async () => {
    const connector = createImapConnector({
      source: source({
        intake: {
          ...source().intake,
          watchedFolders: ["INBOX", "Archive"],
          messageFilters: { mode: "and", rules: [] },
          skipSenders: [],
        },
      }),
      password: "top-secret",
      ownerEmails: ["owner@example.com"],
      manualReviewKeywords: [],
      ImapFlow: fakeImapFlowByFolder({
        INBOX: { 11: rawReplayEmail },
        Archive: {
          21: rawSensitiveGroupEmail,
          22: rawReplayEmail.replace("<m1@example.com>", "<m22@example.com>"),
        },
      }),
      now: new Date("2026-05-10T00:00:00.000Z"),
    })

    const result = await connector.sync({
      workspaceId: "workspace_1",
      sourceId: "source_1",
      limit: 2,
    })

    expect(result.records.map((record) => record.externalId)).toEqual([
      "message:<m1@example.com>",
      "imap:Archive:84:21",
    ])
    expect(result).toMatchObject({
      truncated: true,
      cursor: {
        folders: {
          INBOX: {
            uidValidity: "42",
            lastUid: 11,
            exhausted: true,
          },
          Archive: {
            uidValidity: "84",
            lastUid: 21,
            exhausted: false,
          },
        },
      },
    })
  })

  it("marks owner-sent group emails sensitive and keeps external recipients", async () => {
    const connector = createImapConnector({
      source: source({
        intake: {
          ...source().intake,
          messageFilters: { mode: "and", rules: [] },
          skipSenders: [],
        },
      }),
      password: "top-secret",
      ownerEmails: ["owner@example.com"],
      manualReviewKeywords: ["trauma"],
      ImapFlow: fakeImapFlow({ 13: rawSensitiveGroupEmail }),
      now: new Date("2026-05-10T00:00:00.000Z"),
    })

    const result = await connector.preview({
      workspaceId: "workspace_1",
      sourceId: "source_1",
      limit: 10,
    })

    expect(result.records[0]).toMatchObject({
      eventType: "email_sent",
      participants: [
        { email: "anna@example.com", role: "external" },
        { email: "priya@example.com", role: "external" },
      ],
      sensitivityLevel: 2,
      metadata: { matchedSensitivityKeywords: ["trauma"] },
    })
  })

  it("uses the injected clock when a message has no parsed or internal date", async () => {
    class FakeImapFlow {
      constructor(readonly options: unknown) {}

      async connect() {}

      async mailboxOpen() {
        return { uidValidity: BigInt(42) }
      }

      async search() {
        return [31]
      }

      async *fetch() {
        yield {
          uid: 31,
          source: Buffer.from(rawNoDateEmail),
        }
      }

      async logout() {}

      close() {}
    }

    const connector = createImapConnector({
      source: source({
        intake: {
          ...source().intake,
          messageFilters: { mode: "and", rules: [] },
          skipSenders: [],
        },
      }),
      password: "top-secret",
      ownerEmails: ["owner@example.com"],
      manualReviewKeywords: [],
      ImapFlow: FakeImapFlow,
      now: new Date("2026-04-01T00:00:00.000Z"),
    })

    const result = await connector.sync({
      workspaceId: "workspace_1",
      sourceId: "source_1",
      limit: 10,
    })

    expect(result.records[0]).toMatchObject({
      externalId: "message:<m3@example.com>",
      occurredAt: "2026-04-01T00:00:00.000Z",
    })
  })

  it("wraps IMAP connect failures with a stable domain code", async () => {
    const calls: unknown[] = []
    class FailingImapFlow {
      constructor(options: unknown) {
        void options
      }

      async connect() {
        calls.push("connect")
        throw new Error("network timeout")
      }

      async mailboxOpen() {
        return { uidValidity: BigInt(42) }
      }

      async search() {
        return []
      }

      async *fetch() {}

      async logout() {}

      close() {
        calls.push("close")
      }
    }

    const connector = createImapConnector({
      source: source(),
      password: "top-secret",
      ownerEmails: ["owner@example.com"],
      manualReviewKeywords: [],
      ImapFlow: FailingImapFlow,
    })

    await expect(
      connector.sync({
        workspaceId: "workspace_1",
        sourceId: "source_1",
        limit: 1,
      })
    ).rejects.toThrow("imap_connection_failed")
    expect(calls).toEqual(["connect", "close"])
  })
})
