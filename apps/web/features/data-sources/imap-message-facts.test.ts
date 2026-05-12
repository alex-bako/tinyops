import { describe, expect, it } from "vitest"

import {
  buildImapMessageFacts,
  ownerEmailSet,
} from "@/features/data-sources/imap-message-facts"
import { buildImapConnectorRecordFromFacts } from "@/features/data-sources/imap-record-normalizer"
import type { ImapDataSource } from "@/features/data-sources/types"

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
      skipSenders: [],
      messageFilters: { mode: "and", rules: [] },
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

describe("IMAP message facts", () => {
  it("parses reusable message facts before building one connector record", () => {
    const dataSource = source()
    const result = buildImapMessageFacts({
      source: dataSource,
      uid: 42,
      uidValidity: "99",
      folder: "INBOX",
      parsed: {
        messageId: "<reply@example.com>",
        inReplyTo: "<root@example.com>",
        references: ["<root@example.com>"],
        from: { value: [{ address: "anna@example.com", name: "Anna" }] },
        to: { value: [{ address: "owner@example.com", name: "Owner" }] },
        subject: "Replay access",
        text: "Could you resend the replay link?",
        date: new Date("2026-05-07T08:00:00.000Z"),
      },
      ownerEmails: ownerEmailSet("owner@example.com", []),
      manualReviewKeywords: ["replay"],
      fallbackDate: new Date("2026-05-10T00:00:00.000Z"),
    })

    expect(result).toMatchObject({
      ok: true,
      facts: {
        externalId: "message:<reply@example.com>",
        eventType: "email_received",
        bodyText: "Could you resend the replay link?",
        headers: {
          messageId: "<reply@example.com>",
          linkedMessageIds: ["<root@example.com>"],
        },
      },
    })
    if (!result.ok) throw new Error("expected facts")

    const record = buildImapConnectorRecordFromFacts({
      source: dataSource,
      facts: result.facts,
      thread: {
        folderRole: "watched",
        importReason: "thread_member",
        anchored: false,
      },
    })

    expect(record).toMatchObject({
      externalId: "message:<reply@example.com>",
      body: {
        text: result.facts.bodyText,
        blocks: [{ kind: "text", text: result.facts.bodyText }],
      },
      metadata: {
        subject: "Replay access",
        imapThread: {
          threadKey: "<root@example.com>",
          importReason: "thread_member",
          anchored: false,
        },
      },
    })
  })

  it("applies skip sender intake before connector record construction", () => {
    const result = buildImapMessageFacts({
      source: source({
        intake: {
          ...source().intake,
          skipSenders: ["*@example.com"],
        },
      }),
      uid: 42,
      uidValidity: "99",
      folder: "INBOX",
      parsed: {
        from: { value: [{ address: "notifications@example.com" }] },
        to: { value: [{ address: "owner@example.com" }] },
        subject: "Replay receipt",
        text: "Automated receipt",
      },
      ownerEmails: ownerEmailSet("owner@example.com", []),
      manualReviewKeywords: [],
      fallbackDate: new Date("2026-05-10T00:00:00.000Z"),
    })

    expect(result).toEqual({ ok: false, reason: "skip_sender" })
  })
})
