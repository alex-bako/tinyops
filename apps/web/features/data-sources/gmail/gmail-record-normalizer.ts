import type { NormalizedConnectorRecord } from "@/features/clients/application/connector-ingestion"
import { createTextTimelineEventBody } from "@/features/clients/domain/timeline-event-body"
import type { EmailMessageFacts } from "@/features/data-sources/email/email-message-facts"
import type { GmailDataSource } from "@/features/data-sources/types"

export type GmailMessageMetadata = {
  messageId: string
  threadId: string | null
  labelIds: string[]
}

/**
 * Builds a `NormalizedConnectorRecord` from the provider-neutral email facts
 * plus Gmail-specific metadata. The `externalId` reuses the RFC Message-ID when
 * present (so a Gmail record and an IMAP record of the same email converge),
 * falling back to the stable Gmail message id.
 */
export function buildGmailConnectorRecordFromFacts({
  source,
  facts,
  gmail,
}: {
  source: GmailDataSource
  facts: EmailMessageFacts
  gmail: GmailMessageMetadata
}): NormalizedConnectorRecord {
  return {
    workspaceId: source.workspaceId,
    sourceId: source.id,
    sourceType: "gmail",
    externalId: facts.externalId ?? `gmail:${gmail.messageId}`,
    recordType: "email",
    eventType: facts.eventType,
    occurredAt: facts.occurredAt,
    body: createTextTimelineEventBody(facts.bodyText),
    participants: facts.participants,
    metadata: {
      subject: facts.subject,
      messageId: facts.messageId,
      gmail: {
        messageId: gmail.messageId,
        threadId: gmail.threadId,
        labelIds: gmail.labelIds,
      },
      emailThread: {
        messageId: facts.headers.messageId,
        inReplyTo: facts.headers.inReplyTo,
        references: facts.headers.references,
        linkedMessageIds: facts.headers.linkedMessageIds,
        relatedMessageIds: facts.headers.relatedMessageIds,
        threadKey: facts.headers.threadKey,
      },
      matchedSensitivityKeywords: facts.matchedSensitivityKeywords,
    },
    attributes: [],
    sensitivityLevel: facts.sensitivityLevel,
  }
}
