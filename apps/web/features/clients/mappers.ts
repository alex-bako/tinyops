import {
  type ClientDetail,
  type ClientFlag,
  type ClientStatus,
  type ClientTimelineEvent,
  type TimelineEventType,
} from "@/lib/clients"
import type {
  ClientProfile,
  ClientRow,
  ClientSearchResult,
  ClientTimelineEventRow,
  ClientTimelineEntry,
} from "@/features/clients/types"

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

const TIMELINE_EVENT_TYPE: Record<string, TimelineEventType> = {
  email_received: "email",
  email_sent: "email",
  form_submission: "form",
  csv_import_row: "csvimport",
  manual_note: "csvimport",
  tinyops_email: "sent",
  system_event: "csvimport",
}

export function mapClientRowToProfile(row: ClientRow): ClientProfile {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    primaryEmail: row.primary_email,
    displayName: row.display_name,
    slug: row.slug,
    status: row.status,
    tags: row.tags,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    lastContactedAt: row.last_contacted_at,
    doNotContact: row.do_not_contact,
    unsubscribeStatus: row.unsubscribe_status,
    consentStatus: row.consent_status,
    sensitivityLevel: row.sensitivity_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    timeline: (row.timeline_events ?? []).map(mapTimelineEventRow),
  }
}

export function mapClientProfileToDetail(profile: ClientProfile): ClientDetail {
  const timeline = mapTimelineEvents(profile.timeline)
  const sourceIds = new Set(
    timelineSourceRows(profile.timeline).map((event) => event.sourceId)
  )
  const status = coerceStatus(profile.status, profile.doNotContact)
  const flags = flagsFor(profile, status, profile.timeline)
  const name = profile.displayName.trim() || profile.primaryEmail
  const cohort = profile.tags.find((tag) => tag.toLowerCase().includes("cohort"))
    ?? "Imported"
  const lastSeen =
    profile.lastContactedAt ?? profile.lastSeenAt ?? profile.updatedAt

  return {
    name,
    email: profile.primaryEmail,
    cohort,
    status,
    sources: sourceIds.size,
    lastContact: formatDate(lastSeen),
    lastEvent: formatDate(lastSeen),
    flags,
    slug: profile.slug,
    joined: formatDate(profile.firstSeenAt ?? profile.createdAt),
    location: "Remote",
    memory: {
      summary:
        timeline.length > 0
          ? `${name} has ${timeline.length} imported timeline event${timeline.length === 1 ? "" : "s"}.`
          : "No timeline events imported yet.",
      confidence: timeline.length > 0 ? 0.45 : 0.1,
      lastGenerated:
        timeline.length > 0
          ? `Generated from ${timeline.length} events`
          : "Not generated yet",
    },
    properties: [
      {
        key: "Status",
        icon: "circle-dot",
        value: {
          kind: "badge",
          variant: statusBadgeVariant(status),
          label: statusLabel(status),
        },
      },
      {
        key: "Cohort",
        icon: "hash",
        value: { kind: "tags", values: [cohort] },
      },
      {
        key: "Sources",
        icon: "plug",
        value: { kind: "tags", values: [`${sourceIds.size}`] },
      },
    ],
    timeline,
  }
}

export function mapClientProfileToSearchResult(
  profile: ClientProfile
): ClientSearchResult {
  const sourceIds = new Set(
    timelineSourceRows(profile.timeline).map((event) => event.sourceId)
  )
  return {
    id: profile.id,
    slug: profile.slug,
    name: profile.displayName.trim() || profile.primaryEmail,
    email: profile.primaryEmail,
    lastInteractionAt: profile.lastContactedAt ?? profile.lastSeenAt,
    sourceCount: sourceIds.size,
  }
}

function mapTimelineEventRow(row: ClientTimelineEventRow): ClientTimelineEntry {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    sourceId: row.source_id,
    rawRecordId: row.raw_record_id,
    eventType: row.event_type,
    occurredAt: row.event_date,
    title: row.title,
    summary: row.summary,
    bodyText: row.body_text,
    participants: row.participants,
    metadata: row.metadata,
    sensitivityLevel: row.sensitivity_level,
    aiExtractedFields: row.ai_extracted_fields,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTimelineEvents(rows: ClientTimelineEntry[]): ClientTimelineEvent[] {
  return [...rows]
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
    .map((event) => ({
      type: TIMELINE_EVENT_TYPE[event.eventType] ?? "csvimport",
      date: formatDate(event.occurredAt),
      title: event.title,
      summary: event.summary || event.bodyText,
      sensitive: event.sensitivityLevel >= 2,
    }))
}

function timelineSourceRows(rows: ClientTimelineEntry[]) {
  return rows.filter((event) => event.sourceId)
}

function flagsFor(
  profile: ClientProfile,
  status: ClientStatus,
  events: ClientTimelineEntry[]
): ClientFlag[] {
  const flags: ClientFlag[] = []
  if (status === "dnc" || profile.doNotContact) flags.push("dnc")
  if (status === "inactive") flags.push("idle")
  if (
    status === "sensitive" ||
    profile.sensitivityLevel >= 2 ||
    events.some((event) => event.sensitivityLevel >= 2)
  ) {
    flags.push("sensitive")
  }
  return flags
}

function coerceStatus(value: string, doNotContact: boolean): ClientStatus {
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

function statusLabel(status: ClientStatus) {
  if (status === "dnc") return "Do not contact"
  if (status === "sensitive") return "Sensitive"
  return status[0]!.toUpperCase() + status.slice(1)
}

function statusBadgeVariant(status: ClientStatus) {
  if (status === "inactive") return "neutral"
  return status
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown"
  return DATE_FORMATTER.format(new Date(value))
}
