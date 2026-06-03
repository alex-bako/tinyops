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
  listClients(workspaceId: string): Promise<ClientProfile[]>
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
  return "Timeline event"
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
