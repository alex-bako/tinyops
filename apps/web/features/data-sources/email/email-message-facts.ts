import type {
  NormalizedConnectorRecord,
  NormalizedParticipant,
} from "@/features/clients/application/connector-ingestion"
import { classifyTimelineSensitivity } from "@/features/clients/domain/sensitivity"
import { matchesImapSkipSender } from "@/features/data-sources/imap-intake-predicate"
import {
  buildImapThreadHeaders,
  type ImapThreadHeaders,
} from "@/features/data-sources/imap-threading"
import { normalizeEmail } from "@/lib/auth/email"

/**
 * Provider-neutral email normalization.
 *
 * This is the shared core that both the IMAP and Gmail connectors feed. It owns
 * everything about turning a parsed RFC822 message into the participant /
 * threading / sensitivity / event-type facts that become a
 * `NormalizedConnectorRecord`. Provider-specific concerns (IMAP uid/folder,
 * Gmail message/thread/label ids, and the per-provider `externalId` fallback)
 * are layered on top by each connector's record builder.
 *
 * Thread-header parsing lives in `imap-threading` — it is RFC Message-ID based
 * and provider-neutral despite the file name.
 */

export type ParsedAddress = {
  address?: string
  name?: string
}

export type ParsedAddressList = {
  value?: ParsedAddress[]
}

export type ParsedMailLike = {
  messageId?: string
  inReplyTo?: string
  references?: string[]
  subject?: string
  date?: Date
  text?: string
  from?: ParsedAddressList
  to?: ParsedAddressList
  cc?: ParsedAddressList
  bcc?: ParsedAddressList
}

export type EmailEventType = Extract<
  NormalizedConnectorRecord["eventType"],
  "email_received" | "email_sent"
>

export type EmailMessageFacts = {
  messageId: string | null
  /** Canonical, provider-neutral id (`message:<id>`) or null when no Message-ID. */
  externalId: string | null
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
  sensitivityLevel: NormalizedConnectorRecord["sensitivityLevel"]
}

export type EmailMessageFactsResult =
  | { ok: true; facts: EmailMessageFacts }
  | { ok: false; reason: "skip_sender" | "no_external_participant" }

export function buildEmailMessageFacts({
  parsed,
  ownerEmails,
  skipSenders,
  manualReviewKeywords,
  fallbackDate,
  internalDate,
}: {
  parsed: ParsedMailLike
  ownerEmails: Set<string>
  skipSenders: string[]
  manualReviewKeywords: string[]
  fallbackDate: Date
  internalDate?: Date | string
}): EmailMessageFactsResult {
  const fromEmails = addressEmails(parsed.from)
  if (matchesImapSkipSender(skipSenders, fromEmails)) {
    return { ok: false, reason: "skip_sender" }
  }

  const participants = externalParticipants(parsed, ownerEmails)
  if (participants.length === 0) {
    return { ok: false, reason: "no_external_participant" }
  }

  const bodyText = (parsed.text ?? "").trim()
  const subject = (parsed.subject ?? "(no subject)").trim()
  const sensitivity = classifyTimelineSensitivity({
    text: `${subject}\n${bodyText}`,
    manualReviewKeywords,
  })
  const messageId = parsed.messageId?.trim() || null
  const senderIsOwner = fromEmails.some((email) => ownerEmails.has(email))
  const headers = buildImapThreadHeaders({
    messageId,
    inReplyTo: parsed.inReplyTo,
    references: parsed.references,
  })

  return {
    ok: true,
    facts: {
      messageId,
      externalId: messageId ? `message:${messageId}` : null,
      headers,
      subject,
      bodyText,
      fromEmails,
      toEmails: addressEmails(parsed.to),
      ccEmails: addressEmails(parsed.cc),
      bccEmails: addressEmails(parsed.bcc),
      eventType: senderIsOwner ? "email_sent" : "email_received",
      occurredAt: toIso(parsed.date ?? internalDate ?? fallbackDate),
      participants,
      matchedSensitivityKeywords: sensitivity.matchedKeywords,
      sensitivityLevel: sensitivity.level,
    },
  }
}

export function ownerEmailSet(primary: string, ownerEmails: string[]) {
  return new Set(
    [primary, ...ownerEmails].flatMap((value) => {
      const email = normalizeEmail(value)
      return email ? [email] : []
    })
  )
}

export function addressEmails(list: ParsedAddressList | undefined) {
  return (list?.value ?? []).flatMap((address) => {
    const email = normalizeEmail(address.address ?? "")
    return email ? [email] : []
  })
}

function externalParticipants(
  parsed: ParsedMailLike,
  ownerEmails: Set<string>
): NormalizedParticipant[] {
  const seen = new Set<string>()
  return [
    ...(parsed.from?.value ?? []),
    ...(parsed.to?.value ?? []),
    ...(parsed.cc?.value ?? []),
    ...(parsed.bcc?.value ?? []),
  ].flatMap((address) => {
    const email = normalizeEmail(address.address ?? "")
    if (!email || ownerEmails.has(email) || seen.has(email)) return []
    seen.add(email)
    return [{ email, name: address.name ?? null, role: "external" as const }]
  })
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}
