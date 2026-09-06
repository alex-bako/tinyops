import type { ImapRecipientLookup } from "./imap-recipient-lookup"
import { describe, expect, it, vi } from "vitest"

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
      recipientLookup: async () => [],
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
      recipientLookup: async () => [],
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
      recipientLookup: async () => [],
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
        no_known_recipient: 1,
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
      recipientLookup: async () => ["anna@example.com", "priya@example.com"],
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
      recipientLookup: async () => [],
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
      recipientLookup: async () => ["anna@example.com", "priya@example.com"],
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

  it("imports historical Sent messages on a fresh connection", async () => {
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
      recipientLookup: async () => ["anna@example.com", "priya@example.com"],
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
    expect(result.records[0]?.eventType).toBe("email_sent")
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
        expect.objectContaining({ path: "Sent", accepted: 1, skipped: 0 }),
      ],
      sentFolders: ["Sent"],
    })
  })

  it("imports new conversations to known clients without reply headers", async () => {
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
      recipientLookup: async () => ["anna@example.com", "priya@example.com"],
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

    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({
      eventType: "email_sent",
      metadata: { imapThread: { importReason: "known_recipient" } },
    })
    expect(result.diagnostics).toMatchObject({
      skips: {},
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
      recipientLookup: async () => ["anna@example.com", "priya@example.com"],
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
      recipientLookup: async () => [],
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
      recipientLookup: async () => [],
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

describe("incoming and outgoing IMAP messages", () => {
  const input = { workspaceId: "workspace_1", sourceId: "source_1", limit: 10 }
  function mailSource() {
    return source({
      intake: { ...source().intake, watchedFolders: ["Sent", "INBOX"] },
      folderSnapshot: {
        availableFolders: [
          { path: "INBOX", messages: 1 },
          { path: "Sent", messages: 3, specialUse: "\\Sent" },
        ],
      },
    })
  }
  const messages = {
    INBOX: { 11: rawThreadAnchorEmail },
    Sent: {
      21: rawOwnerThreadReplyEmail.replace(
        "Subject: Re: Replay access",
        "Subject: Replay access"
      ),
      22: rawOwnerUnlinkedSameSubjectEmail.replace(
        "Subject: Re: Replay access",
        "Subject: Replay access"
      ),
    },
  }
  function connector(
    dataSource: ImapDataSource,
    recipientLookup: ImapRecipientLookup = async () => ["anna@example.com"],
    folders: Record<string, Record<number, string>> = messages
  ) {
    return createImapConnector({
      source: dataSource,
      password: "synthetic-password",
      ownerEmails: ["owner@example.com"],
      manualReviewKeywords: [],
      recipientLookup,
      ImapFlow: fakeImapFlowByFolder(folders),
    })
  }

  it("persists watched history before Sent, then imports distinct replies and new conversations", async () => {
    const dataSource = mailSource()
    const original = structuredClone(dataSource)
    const lookup = vi.fn(async () => ["anna@example.com"])
    const incoming = await connector(dataSource, lookup).sync(input)
    expect(incoming.records.map((record) => record.eventType)).toEqual([
      "email_received",
    ])
    expect(incoming.truncated).toBe(true)
    expect(lookup).not.toHaveBeenCalled()
    expect(incoming.cursor).not.toHaveProperty("folders.Sent")
    const nextSource = {
      ...dataSource,
      sync: {
        ...dataSource.sync,
        cursor: incoming.cursor as Record<string, unknown>,
      },
    }
    const outgoing = await connector(nextSource, lookup).sync(input)
    expect(outgoing.records.map((record) => record.eventType)).toEqual([
      "email_sent",
      "email_sent",
    ])
    expect(outgoing.records.map((record) => record.externalId)).toEqual([
      "message:<owner-reply@example.com>",
      "message:<owner-unlinked@example.com>",
    ])
    expect(outgoing.records.map((record) => record.occurredAt)).toEqual([
      "2026-05-07T10:00:00.000Z",
      "2026-05-07T11:00:00.000Z",
    ])
    expect(outgoing.records.map((record) => record.body.text)).toEqual([
      "I resent the replay library link.",
      "Same subject but no thread headers.",
    ])
    expect(lookup).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      emails: ["anna@example.com"],
    })
    const incremental = await connector({
      ...dataSource,
      sync: {
        ...dataSource.sync,
        cursor: outgoing.cursor as Record<string, unknown>,
      },
    }).sync(input)
    expect(incremental.records).toEqual([])
    expect(dataSource).toEqual(original)
  })

  it("does not reach Sent while a watched batch still has filtered-out history", async () => {
    const result = await connector(mailSource(), undefined, {
      ...messages,
      INBOX: { 11: rawNoreplyEmail, 12: rawThreadAnchorEmail },
    }).sync({ ...input, limit: 1 })
    expect(result.records).toEqual([])
    expect(result.truncated).toBe(true)
    expect(result.cursor).not.toHaveProperty("folders.Sent")
  })

  it("retains only known To/Cc/Bcc recipients and excludes the owner", async () => {
    const lookup = vi.fn(async () => [
      "anna@example.com",
      "cc@example.com",
      "bcc@example.com",
      "owner@example.com",
    ])
    const email = rawOwnerThreadReplyEmail.replace(
      "To: Anna Smith <anna@example.com>",
      "To: Anna <ANNA@example.com>, Unknown <unknown@example.com>, Owner <owner@example.com>\r\nCc: cc@example.com\r\nBcc: bcc@example.com"
    )
    const result = await connector(mailSource(), lookup, {
      INBOX: {},
      Sent: { 21: email },
    }).sync(input)
    expect(
      result.records[0]?.participants.map((person) => person.email)
    ).toEqual(["anna@example.com", "cc@example.com", "bcc@example.com"])
    expect(lookup).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      emails: [
        "anna@example.com",
        "unknown@example.com",
        "cc@example.com",
        "bcc@example.com",
      ],
    })
  })

  it("skips unknown recipients, including linked replies, and advances bounded batches", async () => {
    const dataSource = mailSource()
    const first = await connector(dataSource, async () => [], {
      ...messages,
      INBOX: {},
    }).sync({ ...input, limit: 1 })
    expect(first.records).toEqual([])
    expect(first.diagnostics).toMatchObject({
      skips: { no_known_recipient: 1 },
    })
    expect(first.cursor).toMatchObject({ folders: { Sent: { lastUid: 21 } } })
    expect(first.truncated).toBe(true)
    const second = await connector(
      {
        ...dataSource,
        sync: {
          ...dataSource.sync,
          cursor: first.cursor as Record<string, unknown>,
        },
      },
      async () => [],
      { ...messages, INBOX: {} }
    ).sync(input)
    expect(second.records).toEqual([])
    expect(second.truncated).toBe(false)
  })

  it("preserves cursors on lookup failure and can retry the same message", async () => {
    const dataSource = mailSource()
    dataSource.sync.cursor = {
      folders: {
        INBOX: { uidValidity: "42", lastUid: 11 },
        Sent: { uidValidity: "84", lastUid: 21 },
      },
    }
    const original = structuredClone(dataSource)
    await expect(
      connector(dataSource, async () => {
        throw new Error("lookup_failed")
      }).sync(input)
    ).rejects.toThrow("lookup_failed")
    expect(dataSource).toEqual(original)
    const retried = await connector(dataSource).sync(input)
    expect(retried.records.map((record) => record.externalId)).toEqual([
      "message:<owner-unlinked@example.com>",
    ])
  })

  it("deduplicates repeated message IDs while keeping different same-subject messages", async () => {
    const result = await connector(mailSource(), undefined, {
      INBOX: {},
      Sent: { 21: rawOwnerThreadReplyEmail, 22: rawOwnerThreadReplyEmail, 23: rawOwnerUnlinkedSameSubjectEmail },
    }).sync(input)
    expect(result.records.map((record) => record.externalId)).toEqual(["message:<owner-reply@example.com>", "message:<owner-unlinked@example.com>"])
    expect(result.diagnostics).toMatchObject({ skips: { duplicate_message: 1 } })
    expect(result.cursor).toMatchObject({ folders: { Sent: { lastUid: 23 } } })
  })

  it("rescans changed UID validity using stable message IDs for ingestion deduplication", async () => {
    const dataSource = mailSource()
    dataSource.sync.cursor = {
      folders: {
        INBOX: { uidValidity: "42", lastUid: 11 },
        Sent: { uidValidity: "old", lastUid: 900 },
      },
    }
    const result = await connector(dataSource).sync(input)
    expect(result.records.map((record) => record.externalId)).toEqual([
      "message:<owner-reply@example.com>",
      "message:<owner-unlinked@example.com>",
    ])
    expect(result.cursor).toMatchObject({
      folders: { Sent: { uidValidity: "84", lastUid: 22 } },
    })
  })
})
