import { describe, expect, it } from "vitest"

import { buildGmailConnectorRecordFromFacts } from "@/features/data-sources/gmail/gmail-record-normalizer"
import type { EmailMessageFacts } from "@/features/data-sources/email/email-message-facts"
import type { GmailDataSource } from "@/features/data-sources/types"

const SOURCE = {
  id: "source_1",
  workspaceId: "workspace_1",
} as unknown as GmailDataSource

function facts(overrides: Partial<EmailMessageFacts> = {}): EmailMessageFacts {
  return {
    messageId: "<m1@acme.test>",
    externalId: "message:<m1@acme.test>",
    headers: {
      messageId: "<m1@acme.test>",
      inReplyTo: null,
      references: [],
      linkedMessageIds: [],
      relatedMessageIds: ["<m1@acme.test>"],
      threadKey: "<m1@acme.test>",
    },
    subject: "Hi",
    bodyText: "Hello",
    fromEmails: ["client@acme.test"],
    toEmails: ["owner@gmail.com"],
    ccEmails: [],
    bccEmails: [],
    eventType: "email_received",
    occurredAt: "2026-02-02T10:00:00.000Z",
    participants: [{ email: "client@acme.test", name: "Client", role: "external" }],
    matchedSensitivityKeywords: [],
    sensitivityLevel: 0,
    ...overrides,
  }
}

describe("buildGmailConnectorRecordFromFacts", () => {
  it("reuses the RFC Message-ID as the externalId for cross-provider dedupe", () => {
    const record = buildGmailConnectorRecordFromFacts({
      source: SOURCE,
      facts: facts(),
      gmail: { messageId: "g-1", threadId: "thr-1", labelIds: ["INBOX"] },
    })
    expect(record.sourceType).toBe("gmail")
    expect(record.externalId).toBe("message:<m1@acme.test>")
    expect(record.metadata).toMatchObject({
      gmail: { messageId: "g-1", threadId: "thr-1", labelIds: ["INBOX"] },
    })
  })

  it("falls back to the Gmail message id when there is no Message-ID", () => {
    const record = buildGmailConnectorRecordFromFacts({
      source: SOURCE,
      facts: facts({ messageId: null, externalId: null }),
      gmail: { messageId: "g-42", threadId: null, labelIds: [] },
    })
    expect(record.externalId).toBe("gmail:g-42")
  })
})
