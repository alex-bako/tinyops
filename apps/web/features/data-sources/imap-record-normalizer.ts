import type {
  NormalizedConnectorRecord,
  NormalizedParticipant,
} from "@/features/clients/ingestion"
import { classifyTimelineSensitivity } from "@/features/clients/sensitivity"
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
  subject?: string
  date?: Date
  text?: string
  from?: ParsedAddressList
  to?: ParsedAddressList
  cc?: ParsedAddressList
  bcc?: ParsedAddressList
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
}): NormalizedConnectorRecord | null {
  if (shouldSkipSender(source, parsed)) return null

  const bodyText = (parsed.text ?? "").trim()
  const subject = (parsed.subject ?? "(no subject)").trim()
  const fromEmails = addressEmails(parsed.from)
  const senderIsOwner = fromEmails.some((email) => ownerEmails.has(email))
  const participants = externalParticipants(parsed, ownerEmails)
  if (participants.length === 0) return null

  const sensitivity = classifyTimelineSensitivity({
    text: `${subject}\n${bodyText}`,
    manualReviewKeywords,
  })
  const messageId = parsed.messageId?.trim()

  return {
    workspaceId: source.workspaceId,
    sourceId: source.id,
    sourceType: "imap",
    externalId: messageId
      ? `message:${messageId}`
      : `imap:${folder}:${uidValidity}:${uid}`,
    recordType: "email",
    eventType: senderIsOwner ? "email_sent" : "email_received",
    occurredAt: toIso(parsed.date ?? internalDate ?? fallbackDate),
    title: subject,
    summary: summarizeEmail(bodyText),
    bodyText,
    participants,
    metadata: {
      folder,
      uid,
      uidValidity,
      messageId: messageId ?? null,
      matchedSensitivityKeywords: sensitivity.matchedKeywords,
    },
    attributes: [],
    sensitivityLevel: sensitivity.level,
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

function shouldSkipSender(source: ImapDataSource, parsed: ParsedMailLike) {
  return addressEmails(parsed.from).some((email) =>
    source.intake.skipSenders.some((pattern) => matchesEmailPattern(pattern, email))
  )
}

function matchesEmailPattern(pattern: string, email: string) {
  const escaped = pattern
    .trim()
    .toLowerCase()
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", ".*")
  return new RegExp(`^${escaped}$`).test(email)
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
