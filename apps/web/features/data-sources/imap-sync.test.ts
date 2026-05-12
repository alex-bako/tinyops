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

const rawThreadAnchorEmail = [
  "Message-ID: <thread-anchor@example.com>",
  "From: Anna Smith <anna@example.com>",
  "To: Owner <owner@example.com>",
  "Subject: Replay access",
  "Date: Thu, 7 May 2026 08:00:00 +0000",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Could you resend the replay library link?",
].join("\r\n")

const rawThreadFollowupEmail = [
  "Message-ID: <thread-followup@example.com>",
  "In-Reply-To: <thread-anchor@example.com>",
  "References: <thread-anchor@example.com>",
  "From: Anna Smith <anna@example.com>",
  "To: Owner <owner@example.com>",
  "Subject: Different subject",
  "Date: Thu, 7 May 2026 09:00:00 +0000",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Following up in the same conversation.",
].join("\r\n")

const rawOwnerThreadReplyEmail = [
  "Message-ID: <owner-reply@example.com>",
  "In-Reply-To: <thread-anchor@example.com>",
  "References: <thread-anchor@example.com>",
  "From: Owner <owner@example.com>",
  "To: Anna Smith <anna@example.com>",
  "Subject: Re: Replay access",
  "Date: Thu, 7 May 2026 10:00:00 +0000",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "I resent the replay library link.",
].join("\r\n")

const rawOwnerUnlinkedSameSubjectEmail = [
  "Message-ID: <owner-unlinked@example.com>",
  "From: Owner <owner@example.com>",
  "To: Anna Smith <anna@example.com>",
  "Subject: Re: Replay access",
  "Date: Thu, 7 May 2026 11:00:00 +0000",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Same subject but no thread headers.",
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
      cursor: null,
      lastError: null,
      lastSyncedAt: null,
    },
    createdAt: "2026-05-07T00:00:00.000Z",
    updatedAt: "2026-05-07T00:00:00.000Z",
    ...patch,
    sourceSlug: patch.sourceSlug ?? "imap-mailbox",
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

function fakeImapFlowByFolder(
  messagesByFolder: Record<string, Record<number, string>>
) {
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
      body: {
        text: "Could you resend the replay library link?",
        blocks: [
          { kind: "text", text: "Could you resend the replay library link?" },
        ],
      },
      metadata: { subject: "Replay access" },
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
      records: [
        expect.objectContaining({ externalId: "message:<m1@example.com>" }),
      ],
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

  it("returns aggregate diagnostics for scanned, accepted, and skipped messages", async () => {
    const connector = createImapConnector({
      source: source(),
      password: "top-secret",
      ownerEmails: ["owner@example.com"],
      manualReviewKeywords: [],
      ImapFlow: fakeImapFlow({
        11: rawReplayEmail,
        12: rawNoreplyEmail,
        13: rawSensitiveGroupEmail,
      }),
      now: new Date("2026-05-10T00:00:00.000Z"),
    })

    const result = await connector.sync({
      workspaceId: "workspace_1",
      sourceId: "source_1",
      limit: 10,
    })

    expect(result.records).toHaveLength(1)
    expect(result.diagnostics).toMatchObject({
      folders: [
        {
          path: "INBOX",
          uidValidity: "42",
          startUid: 11,
          endUid: 13,
          searched: 3,
          fetched: 3,
          accepted: 1,
          skipped: 2,
          truncated: false,
        },
      ],
      skips: {
        skip_sender: 1,
        unlinked_sent_message: 1,
      },
    })
    expect(JSON.stringify(result.diagnostics)).not.toContain("anna@example.com")
    expect(JSON.stringify(result.diagnostics)).not.toContain("Replay access")
  })

  it("does not advance a later folder cursor past records returned in the batch", async () => {
    const rawLinkedOwnerNoMessageIdEmail = [
      "In-Reply-To: <m1@example.com>",
      "References: <m1@example.com>",
      "From: Owner <owner@example.com>",
      "To: Anna Smith <anna@example.com>, Priya <priya@example.com>",
      "Subject: Checking in",
      "Date: Fri, 8 May 2026 10:00:00 +0000",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "This mentions trauma context.",
    ].join("\r\n")
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
          21: rawLinkedOwnerNoMessageIdEmail,
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

  it("imports linked client follow-ups after a filtered thread anchor", async () => {
    const connector = createImapConnector({
      source: source(),
      password: "top-secret",
      ownerEmails: ["owner@example.com"],
      manualReviewKeywords: [],
      ImapFlow: fakeImapFlow({
        11: rawThreadAnchorEmail,
        12: rawThreadFollowupEmail,
      }),
      now: new Date("2026-05-10T00:00:00.000Z"),
    })

    const result = await connector.sync({
      workspaceId: "workspace_1",
      sourceId: "source_1",
      limit: 10,
    })

    expect(result.records.map((record) => record.externalId)).toEqual([
      "message:<thread-anchor@example.com>",
      "message:<thread-followup@example.com>",
    ])
    expect(result.records[1]).toMatchObject({
      eventType: "email_received",
      metadata: {
        imapThread: {
          threadKey: "<thread-anchor@example.com>",
          importReason: "thread_member",
          folderRole: "watched",
          anchored: false,
        },
      },
    })
  })

  it("imports future Sent replies linked to persisted thread anchors", async () => {
    const connector = createImapConnector({
      source: source({
        folderSnapshot: {
          availableFolders: [
            { path: "INBOX", messages: 3 },
            { path: "Sent", messages: 12, specialUse: "\\Sent" },
          ],
        },
        sync: {
          ...source().sync,
          cursor: {
            folders: {
              INBOX: { uidValidity: "42", lastUid: 11, exhausted: true },
              Sent: { uidValidity: "84", lastUid: 20, exhausted: true },
            },
          },
        },
      }),
      password: "top-secret",
      ownerEmails: ["owner@example.com"],
      manualReviewKeywords: [],
      threadIndexReader: {
        async read() {
          return { messageIds: ["<thread-anchor@example.com>"] }
        },
      },
      ImapFlow: fakeImapFlowByFolder({
        INBOX: {},
        Sent: { 21: rawOwnerThreadReplyEmail },
      }),
      now: new Date("2026-05-10T00:00:00.000Z"),
    })

    const result = await connector.sync({
      workspaceId: "workspace_1",
      sourceId: "source_1",
      limit: 10,
    })

    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({
      externalId: "message:<owner-reply@example.com>",
      eventType: "email_sent",
      participants: [{ email: "anna@example.com", role: "external" }],
      metadata: {
        imapThread: {
          threadKey: "<thread-anchor@example.com>",
          importReason: "thread_reply",
          folderRole: "sent",
          anchored: false,
        },
      },
    })
    expect(result.diagnostics).toMatchObject({
      sentFolders: ["Sent"],
      skips: {},
    })
  })

  it("seeds an auto-detected Sent cursor without historical backfill", async () => {
    const connector = createImapConnector({
      source: source({
        folderSnapshot: {
          availableFolders: [
            { path: "INBOX", messages: 3 },
            { path: "Sent", messages: 12, specialUse: "\\Sent" },
          ],
        },
      }),
      password: "top-secret",
      ownerEmails: ["owner@example.com"],
      manualReviewKeywords: [],
      threadIndexReader: {
        async read() {
          return { messageIds: ["<thread-anchor@example.com>"] }
        },
      },
      ImapFlow: fakeImapFlowByFolder({
        INBOX: {},
        Sent: { 21: rawOwnerThreadReplyEmail },
      }),
      now: new Date("2026-05-10T00:00:00.000Z"),
    })

    const result = await connector.sync({
      workspaceId: "workspace_1",
      sourceId: "source_1",
      limit: 10,
    })

    expect(result.records).toEqual([])
    expect(result.cursor).toMatchObject({
      folders: {
        Sent: {
          uidValidity: "84",
          lastUid: 21,
          exhausted: true,
        },
      },
    })
    expect(result.diagnostics).toMatchObject({
      folders: [
        expect.objectContaining({ path: "INBOX" }),
        expect.objectContaining({ path: "Sent", accepted: 0, skipped: 0 }),
      ],
      sentFolders: ["Sent"],
    })
  })

  it("does not import owner Sent messages by subject fallback", async () => {
    const connector = createImapConnector({
      source: source({
        folderSnapshot: {
          availableFolders: [
            { path: "INBOX", messages: 3 },
            { path: "Sent", messages: 12, specialUse: "\\Sent" },
          ],
        },
        sync: {
          ...source().sync,
          cursor: {
            folders: {
              INBOX: { uidValidity: "42", lastUid: 11, exhausted: true },
              Sent: { uidValidity: "84", lastUid: 20, exhausted: true },
            },
          },
        },
      }),
      password: "top-secret",
      ownerEmails: ["owner@example.com"],
      manualReviewKeywords: [],
      threadIndexReader: {
        async read() {
          return { messageIds: ["<thread-anchor@example.com>"] }
        },
      },
      ImapFlow: fakeImapFlowByFolder({
        INBOX: {},
        Sent: { 21: rawOwnerUnlinkedSameSubjectEmail },
      }),
      now: new Date("2026-05-10T00:00:00.000Z"),
    })

    const result = await connector.sync({
      workspaceId: "workspace_1",
      sourceId: "source_1",
      limit: 10,
    })

    expect(result.records).toEqual([])
    expect(result.diagnostics).toMatchObject({
      skips: { unlinked_sent_message: 1 },
    })
  })

  it("marks linked owner-sent group replies sensitive and keeps external recipients", async () => {
    const rawSensitiveThreadReplyEmail = [
      "Message-ID: <sensitive-reply@example.com>",
      "In-Reply-To: <thread-anchor@example.com>",
      "References: <thread-anchor@example.com>",
      "From: Owner <owner@example.com>",
      "To: Anna Smith <anna@example.com>, Priya <priya@example.com>",
      "Subject: Checking in",
      "Date: Fri, 8 May 2026 10:00:00 +0000",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "This mentions trauma context.",
    ].join("\r\n")
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
      threadIndexReader: {
        async read() {
          return { messageIds: ["<thread-anchor@example.com>"] }
        },
      },
      ImapFlow: fakeImapFlow({ 13: rawSensitiveThreadReplyEmail }),
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
