import type { Json } from "@/lib/database.types"
import {
  timelineEventBodyToText,
  timelineEventBodyFromJson,
  type TimelineEventBody,
} from "@/features/clients/domain/timeline-event-body"

export type ClientStatus = "active" | "inactive" | "sensitive" | "dnc"

export type ClientFlag = "overdue" | "sensitive" | "idle" | "dnc"

export type TimelineEventType =
  | "email"
  | "form"
  | "sent"
  | "csvimport"
  | "payment"
  | "refund"
  | "dispute"
  | "invoice"
  | "subscription"
  | "engagement"
  | "added"
  | "note"

export type TimelineEventAuthor = {
  id: string
  name: string | null
}

export type ClientTimelineEvent = {
  id: string
  sourceId: string | null
  sourceType: string | null
  type: TimelineEventType
  occurredAt: string
  display: TimelineEventDisplayFacts
  body: TimelineEventBody
  sensitivityLevel: number
  /** Set when this is a note pinned to another event; null otherwise. */
  parentEventId: string | null
  /** Who created the event (notes carry this; source events usually don't). */
  author: TimelineEventAuthor | null
}

export type TimelineEventDisplayFacts = {
  title: string
  summary: string
}

/**
 * Icons a user can attach to a property. The picker offers all of these except
 * `align-left`, which is the implicit default glyph for an untouched text
 * property (mirroring the design kit's PROPERTY_TYPES default).
 */
export type PropertyIcon =
  | "align-left"
  | "circle-dot"
  | "hash"
  | "calendar"
  | "send"
  | "plug"
  | "target"
  | "activity"
  | "wand"
  | "shield-check"
  | "shield-alert"
  | "mail"
  | "map-pin"
  | "tag"
  | "star"
  | "flag"
  | "clock"
  | "link"
  | "file-text"

export type PropertyType = "text" | "tags" | "date" | "status"

/** Status swatch colors; map 1:1 onto the shared Badge variants. */
export type PropertyStatusKind = "active" | "warn" | "brand" | "neutral"

/**
 * A property's value, discriminated to match its `type`. `text` and `date`
 * both carry a plain string (date is just rendered as-is); the discriminant
 * lets the renderer stay exhaustive.
 */
export type ClientPropertyValue =
  | { kind: "text"; text: string }
  | { kind: "date"; text: string }
  | { kind: "tags"; values: string[] }
  | { kind: "status"; statusKind: PropertyStatusKind; label: string }

/** A user-defined, persisted client property. */
export type ClientProperty = {
  id: string
  name: string
  icon: PropertyIcon
  type: PropertyType
  value: ClientPropertyValue
  /** Float ordering key; lower sorts first. */
  position: number
}

const PROPERTY_ICONS: ReadonlySet<PropertyIcon> = new Set<PropertyIcon>([
  "align-left", "circle-dot", "hash", "calendar", "send", "plug", "target",
  "activity", "wand", "shield-check", "shield-alert", "mail", "map-pin", "tag",
  "star", "flag", "clock", "link", "file-text",
])

/** Coerces an arbitrary stored icon string to a known icon, defaulting safely. */
export function coercePropertyIcon(value: string): PropertyIcon {
  return PROPERTY_ICONS.has(value as PropertyIcon)
    ? (value as PropertyIcon)
    : "circle-dot"
}

const PROPERTY_TYPES: ReadonlySet<PropertyType> = new Set<PropertyType>([
  "text", "tags", "date", "status",
])

/** Coerces an arbitrary stored type string to a known type, defaulting safely. */
export function coercePropertyType(value: string): PropertyType {
  return PROPERTY_TYPES.has(value as PropertyType)
    ? (value as PropertyType)
    : "text"
}

export type TimelineEntryAuthorProfile = {
  firstName: string | null
  lastName: string | null
  email: string | null
}

export type ClientTimelineEntry = {
  id: string
  workspaceId: string
  clientId: string
  sourceId: string | null
  sourceType: string | null
  rawRecordId: string | null
  eventType: string
  occurredAt: string
  body: Json
  participants: Json
  metadata: Json
  sensitivityLevel: number
  aiExtractedFields: Json
  parentEventId: string | null
  createdBy: string | null
  createdByProfile: TimelineEntryAuthorProfile | null
  createdAt: string
  updatedAt: string
}

export type ClientProfile = {
  id: string
  workspaceId: string
  primaryEmail: string
  displayName: string
  slug: string
  status: string
  tags: string[]
  firstSeenAt: string | null
  lastSeenAt: string | null
  lastContactedAt: string | null
  doNotContact: boolean
  unsubscribeStatus: string
  consentStatus: string
  sensitivityLevel: number
  createdAt: string
  updatedAt: string
  timeline: ClientTimelineEvent[]
  properties: ClientProperty[]
  /** Connector-ingested facts. Read-only, unlike the user-authored `properties`. */
  attributes: ClientAttribute[]
  /** Every data source this client came from, whether or not it produced events. */
  sourceIds: string[]
}

/** A fact a connector wrote about a client (`client_attributes`). */
export type ClientAttribute = {
  key: string
  value: unknown
  sourceName: string | null
}

/**
 * Scalar row from the `client_list_rows` view. The list table renders eight
 * columns; loading full profiles for it forced a 500-row cap.
 */
export type ClientListRow = {
  id: string
  primaryEmail: string
  displayName: string
  slug: string
  status: string
  tags: string[]
  lastSeenAt: string | null
  lastContactedAt: string | null
  updatedAt: string
  doNotContact: boolean
  sensitivityLevel: number
  sourceCount: number
  maxTimelineSensitivity: number
}

export type ClientSearchResult = {
  id: string
  slug: string
  name: string
  email: string
  lastInteractionAt: string | null
  sourceCount: number
}

export type ClientReaderPort = {
  listClients(workspaceId: string): Promise<ClientListRow[]>
  getRecentClients(workspaceId: string, limit?: number): Promise<ClientProfile[]>
  findClientBySlug(input: {
    workspaceId: string
    slug: string
  }): Promise<ClientProfile | null>
  searchClients(input: {
    workspaceId: string
    query: string
    limit: number
  }): Promise<ClientSearchResult[]>
}

const TIMELINE_EVENT_TYPE: Record<string, TimelineEventType> = {
  email_received: "email",
  email_sent: "sent",
  form_submission: "form",
  csv_import_row: "csvimport",
  manual_note: "note",
  tinyops_email: "sent",
  system_event: "csvimport",
  payment: "payment",
  refund: "refund",
  dispute: "dispute",
  invoice: "invoice",
  subscription: "subscription",
  email_engagement: "engagement",
  contact_added: "added",
}

export function coerceClientStatus(
  value: string,
  doNotContact: boolean
): ClientStatus {
  if (doNotContact) return "dnc"
  if (
    value === "active" ||
    value === "inactive" ||
    value === "sensitive" ||
    value === "dnc"
  ) {
    return value
  }
  return "active"
}

export function clientFlagsFor({
  status,
  doNotContact,
  profileSensitivityLevel,
  timelineSensitivityLevels,
}: {
  status: ClientStatus
  doNotContact: boolean
  profileSensitivityLevel: number
  timelineSensitivityLevels: number[]
}): ClientFlag[] {
  const flags: ClientFlag[] = []
  if (status === "dnc" || doNotContact) flags.push("dnc")
  if (status === "inactive") flags.push("idle")
  if (
    status === "sensitive" ||
    isSensitiveLevel(profileSensitivityLevel) ||
    timelineSensitivityLevels.some(isSensitiveLevel)
  ) {
    flags.push("sensitive")
  }
  return flags
}

export function isSensitiveLevel(level: number) {
  return level >= 2
}

const PROPERTY_STATUS_KINDS: ReadonlySet<PropertyStatusKind> =
  new Set<PropertyStatusKind>(["active", "warn", "brand", "neutral"])

function coerceStatusKind(value: unknown): PropertyStatusKind {
  return typeof value === "string" &&
    PROPERTY_STATUS_KINDS.has(value as PropertyStatusKind)
    ? (value as PropertyStatusKind)
    : "neutral"
}

/**
 * Reconstructs a typed property value from its `type` column and stored jsonb.
 * Tolerates missing/malformed payloads so a bad row never breaks the page.
 */
export function clientPropertyValueFromStored(
  type: PropertyType,
  value: Json
): ClientPropertyValue {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}

  if (type === "tags") {
    const values = Array.isArray(record.values)
      ? record.values.filter((entry): entry is string => typeof entry === "string")
      : []
    return { kind: "tags", values }
  }
  if (type === "status") {
    return {
      kind: "status",
      statusKind: coerceStatusKind(record.statusKind),
      label: typeof record.label === "string" ? record.label : "",
    }
  }
  // text | date — both a plain string
  const text = typeof record.text === "string" ? record.text : ""
  return { kind: type === "date" ? "date" : "text", text }
}

/** Serializes a typed property value to the jsonb stored in client_properties. */
export function clientPropertyValueToStored(value: ClientPropertyValue): Json {
  switch (value.kind) {
    case "tags":
      return { values: value.values }
    case "status":
      return { statusKind: value.statusKind, label: value.label }
    case "text":
    case "date":
      return { text: value.text }
  }
}

export function mapTimelineEntryToEvent(
  event: ClientTimelineEntry
): ClientTimelineEvent {
  const body = timelineEventBodyFromJson(event.body)
  return {
    id: event.id,
    sourceId: event.sourceId,
    sourceType: event.sourceType,
    type: TIMELINE_EVENT_TYPE[event.eventType] ?? "csvimport",
    occurredAt: event.occurredAt,
    display: deriveTimelineEventDisplayFacts({
      eventType: event.eventType,
      body,
      metadata: event.metadata,
    }),
    body,
    sensitivityLevel: event.sensitivityLevel,
    parentEventId: event.parentEventId,
    author: deriveTimelineEventAuthor(event),
  }
}

/**
 * Best-effort display name for a person: "First Last", falling back to email,
 * then null. Shared by note authorship and the acting-user identity.
 */
export function composePersonName(input: {
  firstName: string | null
  lastName: string | null
  email: string | null
}): string | null {
  const full = [input.firstName, input.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ")
  if (full) return full
  const email = input.email?.trim()
  return email || null
}

export function deriveTimelineEventAuthor(
  entry: ClientTimelineEntry
): TimelineEventAuthor | null {
  if (!entry.createdBy) return null
  const profile = entry.createdByProfile
  return {
    id: entry.createdBy,
    name: profile ? composePersonName(profile) : null,
  }
}

export function deriveTimelineEventDisplayFacts({
  eventType,
  body,
  metadata,
}: {
  eventType: string
  body: TimelineEventBody
  metadata: Json
}): TimelineEventDisplayFacts {
  return {
    title: timelineEventTitle({ eventType, metadata }),
    summary: timelineEventSummary(body),
  }
}

export function sortTimelineEventsNewestFirst(
  rows: ClientTimelineEvent[]
): ClientTimelineEvent[] {
  return [...rows].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )
}

const CONNECTOR_EVENT_TITLES: Record<string, string> = {
  payment: "Payment",
  refund: "Refund",
  dispute: "Dispute",
  invoice: "Invoice",
  subscription: "Subscription",
  email_engagement: "Campaign engagement",
  contact_added: "Contact added",
}

function timelineEventTitle({
  eventType,
  metadata,
}: {
  eventType: string
  metadata: Json
}): string {
  if (eventType === "email_received" || eventType === "email_sent") {
    return metadataText(metadata, "subject") ?? "Email"
  }
  if (eventType === "form_submission") {
    return (
      metadataText(metadata, "formTitle") ??
      metadataText(metadata, "sourceDisplayName") ??
      "Google Forms response"
    )
  }
  if (eventType === "csv_import_row") return "CSV import row"
  if (eventType === "manual_note") return "Manual note"
  if (eventType === "tinyops_email") return "TinyOps email"
  if (eventType === "system_event") return "System event"
  // Every connector event carries its own headline in `metadata.title`; the
  // fallback only matters for a record that predates that convention.
  return metadataText(metadata, "title") ?? CONNECTOR_EVENT_TITLES[eventType] ?? "Timeline event"
}

function timelineEventSummary(body: TimelineEventBody): string {
  const compact = timelineEventBodyToText(body).replace(/\s+/g, " ").trim()
  if (!compact) return "No body text"
  if (compact.length <= 180) return compact
  return `${compact.slice(0, 177)}...`
}

function metadataText(metadata: Json, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }
  const value = (metadata as Record<string, unknown>)[key]
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized || null
}
