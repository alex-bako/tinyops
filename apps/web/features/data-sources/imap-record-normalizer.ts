import type { NormalizedConnectorRecord } from "@/features/clients/ingestion"
import {
  buildImapMessageFacts,
  type ImapMessageFacts,
  type ParsedMailLike,
} from "@/features/data-sources/imap-message-facts"
import type { ImapThreadHeaders } from "@/features/data-sources/imap-threading"
import type { ImapDataSource } from "@/features/data-sources/types"

export {
  addressEmails,
  ownerEmailSet,
  type ParsedAddress,
  type ParsedAddressList,
  type ParsedMailLike,
} from "@/features/data-sources/imap-message-facts"

type ImapRecordThreadContext = {
  headers?: ImapThreadHeaders
  folderRole: "watched" | "sent"
  importReason: "filter_anchor" | "thread_member" | "thread_reply"
  anchored: boolean
}

export function buildImapConnectorRecordFromFacts({
  source,
  facts,
  thread,
}: {
  source: ImapDataSource
  facts: ImapMessageFacts
  thread?: ImapRecordThreadContext
}): NormalizedConnectorRecord {
  const threadHeaders = thread?.headers ?? facts.headers

  return {
    workspaceId: source.workspaceId,
    sourceId: source.id,
    sourceType: "imap",
    externalId: facts.externalId,
    recordType: "email",
    eventType: facts.eventType,
    occurredAt: facts.occurredAt,
    title: facts.title,
    summary: facts.summary,
    bodyText: facts.bodyText,
    participants: facts.participants,
    metadata: {
      folder: facts.folder,
      uid: facts.uid,
      uidValidity: facts.uidValidity,
      messageId: facts.messageId,
      imapThread: {
        messageId: threadHeaders.messageId,
        inReplyTo: threadHeaders.inReplyTo,
        references: threadHeaders.references,
        linkedMessageIds: threadHeaders.linkedMessageIds,
        relatedMessageIds: threadHeaders.relatedMessageIds,
        threadKey: threadHeaders.threadKey,
        folderRole: thread?.folderRole ?? "watched",
        importReason: thread?.importReason ?? "filter_anchor",
        anchored: thread?.anchored ?? false,
      },
      matchedSensitivityKeywords: facts.matchedSensitivityKeywords,
    },
    attributes: [],
    sensitivityLevel: facts.sensitivityLevel,
  }
}

export function buildImapConnectorRecord({
  source,
  uid,
  uidValidity,
  folder,
  parsed,
  internalDate,
  ownerEmails,
  manualReviewKeywords,
  fallbackDate,
  thread,
}: {
  source: ImapDataSource
  uid: number
  uidValidity: string
  folder: string
  parsed: ParsedMailLike
  internalDate?: Date | string
  ownerEmails: Set<string>
  manualReviewKeywords: string[]
  fallbackDate: Date
  thread?: ImapRecordThreadContext
}): NormalizedConnectorRecord | null {
  const result = buildImapMessageFacts({
    source,
    uid,
    uidValidity,
    folder,
    parsed,
    internalDate,
    ownerEmails,
    manualReviewKeywords,
    fallbackDate,
  })
  if (!result.ok) return null

  return buildImapConnectorRecordFromFacts({
    source,
    facts: result.facts,
    thread,
  })
}
