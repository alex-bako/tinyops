import type {
  NormalizedConnectorRecord,
  NormalizedParticipant,
} from "@/features/clients/ingestion"
import { classifyTimelineSensitivity } from "@/features/clients/sensitivity"
import { matchesImapSkipSender } from "@/features/data-sources/imap-intake-predicate"
import {
  buildImapThreadHeaders,
  type ImapThreadHeaders,
} from "@/features/data-sources/imap-threading"
import type { ImapDataSource } from "@/features/data-sources/types"
import { normalizeEmail } from "@/lib/auth/email"

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
  eventType: Extract<
    NormalizedConnectorRecord["eventType"],
    "email_received" | "email_sent"
  >
  occurredAt: string
  title: string
  summary: string
  participants: NormalizedParticipant[]
  matchedSensitivityKeywords: string[]
  sensitivityLevel: NormalizedConnectorRecord["sensitivityLevel"]
}

export type ImapMessageFactsResult =
  | { ok: true; facts: ImapMessageFacts }
  | { ok: false; reason: "skip_sender" | "no_external_participant" }

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
  const fromEmails = addressEmails(parsed.from)
  if (matchesImapSkipSender(source.intake.skipSenders, fromEmails)) {
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
      uid,
      uidValidity,
      folder,
      messageId,
      externalId: messageId
        ? `message:${messageId}`
        : `imap:${folder}:${uidValidity}:${uid}`,
      headers,
      subject,
      bodyText,
      fromEmails,
      toEmails: addressEmails(parsed.to),
      ccEmails: addressEmails(parsed.cc),
      bccEmails: addressEmails(parsed.bcc),
      eventType: senderIsOwner ? "email_sent" : "email_received",
      occurredAt: toIso(parsed.date ?? internalDate ?? fallbackDate),
      title: subject,
      summary: summarizeEmail(bodyText),
      participants,
      matchedSensitivityKeywords: sensitivity.matchedKeywords,
      sensitivityLevel: sensitivity.level,
    },
  }
}

export function ownerEmailSet(username: string, ownerEmails: string[]) {
  return new Set(
    [username, ...ownerEmails].flatMap((value) => {
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

function summarizeEmail(bodyText: string) {
  const compact = bodyText.replace(/\s+/g, " ").trim()
  if (compact.length <= 180) return compact
  return `${compact.slice(0, 177)}...`
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}
