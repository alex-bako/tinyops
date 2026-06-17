import type { NormalizedParticipant } from "@/features/clients/application/connector-ingestion"
import {
  addressEmails,
  buildEmailMessageFacts,
  ownerEmailSet,
  type EmailEventType,
  type ParsedAddress,
  type ParsedAddressList,
  type ParsedMailLike,
} from "@/features/data-sources/email/email-message-facts"
import type { ImapThreadHeaders } from "@/features/data-sources/imap-threading"
import type { ImapDataSource } from "@/features/data-sources/types"

// Re-exported so existing IMAP modules keep importing these from here.
export {
  addressEmails,
  ownerEmailSet,
  type ParsedAddress,
  type ParsedAddressList,
  type ParsedMailLike,
}

export type ImapMessageFacts = {
  uid: number
  uidValidity: string
  folder: string
  messageId: string | null
  externalId: string
  headers: ImapThreadHeaders
  subject: string
  bodyText: string
  fromEmails: string[]
  toEmails: string[]
  ccEmails: string[]
  bccEmails: string[]
  eventType: EmailEventType
  occurredAt: string
  participants: NormalizedParticipant[]
  matchedSensitivityKeywords: string[]
  sensitivityLevel: 0 | 1 | 2 | 3 | 4
}

export type ImapMessageFactsResult =
  | { ok: true; facts: ImapMessageFacts }
  | { ok: false; reason: "skip_sender" | "no_external_participant" }

/**
 * IMAP-specific facts builder. Delegates the provider-neutral work to
 * `buildEmailMessageFacts` and layers on the IMAP-only fields (uid / folder)
 * plus the IMAP `externalId` fallback used when a message has no Message-ID.
 */
export function buildImapMessageFacts({
  source,
  uid,
  uidValidity,
  folder,
  parsed,
  internalDate,
  ownerEmails,
  manualReviewKeywords,
  fallbackDate,
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
}): ImapMessageFactsResult {
  const result = buildEmailMessageFacts({
    parsed,
    ownerEmails,
    skipSenders: source.intake.skipSenders,
    manualReviewKeywords,
    fallbackDate,
    internalDate,
  })
  if (!result.ok) return result

  const facts = result.facts
  return {
    ok: true,
    facts: {
      uid,
      uidValidity,
      folder,
      messageId: facts.messageId,
      externalId:
        facts.externalId ?? `imap:${folder}:${uidValidity}:${uid}`,
      headers: facts.headers,
      subject: facts.subject,
      bodyText: facts.bodyText,
      fromEmails: facts.fromEmails,
      toEmails: facts.toEmails,
      ccEmails: facts.ccEmails,
      bccEmails: facts.bccEmails,
      eventType: facts.eventType,
      occurredAt: facts.occurredAt,
      participants: facts.participants,
      matchedSensitivityKeywords: facts.matchedSensitivityKeywords,
      sensitivityLevel: facts.sensitivityLevel,
    },
  }
}
