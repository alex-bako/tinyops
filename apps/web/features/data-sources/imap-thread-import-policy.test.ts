import { describe, expect, it } from "vitest"

import type { ImapMessageFacts } from "@/features/data-sources/imap-message-facts"
import { decideImapThreadImport } from "@/features/data-sources/imap-thread-import-policy"
import {
  buildImapThreadHeaders,
  createImapThreadIndex,
} from "@/features/data-sources/imap-threading"
import type { ImapDataSource } from "@/features/data-sources/types"

function source(): ImapDataSource {
  return {
    id: "source_1",
    workspaceId: "workspace_1",
    type: "imap",
    displayName: "IMAP mailbox",
    sourceSlug: "imap-mailbox",
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
  }
}

function facts(patch: Partial<ImapMessageFacts> = {}): ImapMessageFacts {
  return {
    uid: 42,
    uidValidity: "99",
    folder: "INBOX",
    messageId: "<reply@example.com>",
    externalId: "message:<reply@example.com>",
    headers: buildImapThreadHeaders({
      messageId: "<reply@example.com>",
      references: ["<root@example.com>"],
    }),
    subject: "Different subject",
    bodyText: "Following up.",
    fromEmails: ["anna@example.com"],
    toEmails: ["owner@example.com"],
    ccEmails: [],
    bccEmails: [],
    eventType: "email_received",
    occurredAt: "2026-05-07T08:00:00.000Z",
    participants: [{ email: "anna@example.com", name: null, role: "external" }],
    matchedSensitivityKeywords: [],
    sensitivityLevel: 0,
    ...patch,
  }
}

describe("IMAP thread import policy", () => {
  it("imports filtered anchors and later received thread members by headers", () => {
    const dataSource = source()
    const index = createImapThreadIndex()
    const anchor = facts({
      messageId: "<root@example.com>",
      externalId: "message:<root@example.com>",
      headers: buildImapThreadHeaders({ messageId: "<root@example.com>" }),
      subject: "Replay access",
    })

    expect(
      decideImapThreadImport({
        source: dataSource,
        facts: anchor,
        threadIndex: index,
      })
    ).toEqual({ import: true, reason: "filter_anchor", anchored: true })
    index.anchor(anchor.headers)

    expect(
      decideImapThreadImport({
        source: dataSource,
        facts: facts(),
        threadIndex: index,
      })
    ).toEqual({ import: true, reason: "thread_member", anchored: false })
  })

  it("imports only linked owner-sent replies", () => {
    const dataSource = source()
    const index = createImapThreadIndex(["<root@example.com>"])

    expect(
      decideImapThreadImport({
        source: dataSource,
        facts: facts({ eventType: "email_sent" }),
        threadIndex: index,
      })
    ).toEqual({ import: true, reason: "thread_reply", anchored: false })

    expect(
      decideImapThreadImport({
        source: dataSource,
        facts: facts({
          eventType: "email_sent",
          headers: buildImapThreadHeaders({
            messageId: "<unlinked@example.com>",
          }),
        }),
        threadIndex: index,
      })
    ).toEqual({ import: false, reason: "unlinked_sent_message" })
  })
})
