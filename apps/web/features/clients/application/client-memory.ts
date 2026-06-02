import {
  clientFlagsFor,
  coerceClientStatus,
  sortTimelineEventsNewestFirst,
  type ClientFlag,
  type ClientProfile,
  type ClientReaderPort,
  type ClientSearchResult,
  type ClientStatus,
  type ClientTimelineEvent,
} from "@/features/clients/domain/client-profile"
import {
  CONNECTOR_METADATA,
  isConnectorId,
  type DataSourceIcon,
} from "@/features/data-sources/connector-metadata"

export { type ClientFlag, type ClientSearchResult, type ClientStatus }

export type Client = {
  name: string
  email: string
  cohort: string
  status: ClientStatus
  sources: number
  lastContact: string
  lastEvent: string
  flags: ClientFlag[]
}

export type ClientMemory = {
  summary: string
  confidence: number
  lastGenerated: string
}

export type PropertyIcon =
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
  | "user"
  | "map-pin"

export type ClientPropertyValue =
  | { kind: "text"; value: string }
  | { kind: "tags"; values: string[] }
  | { kind: "source-tags"; sources: { icon: DataSourceIcon; label: string }[] }
  | {
      kind: "badge"
      variant: "active" | "neutral" | "warn" | "sensitive" | "dnc"
      label: string
      dot?: boolean
    }
  | { kind: "tag-and-text"; tag: string; text: string }
  | { kind: "italic"; value: string }

export type ClientProperty = {
  key: string
  icon: PropertyIcon
  value: ClientPropertyValue
  avoid?: boolean
}

export type ClientDetail = Client & {
  slug: string
  joined: string
  location: string
  memory: ClientMemory
  properties: ClientProperty[]
  timeline: ClientTimelineEvent[]
}

export type ClientMemoryRepositoryPort = {
  listClients(): Promise<ClientDetail[]>
  getRecentClients(limit?: number): Promise<ClientDetail[]>
  findClientBySlug(slug: string): Promise<ClientDetail | null>
}

export type ClientNavItem = Pick<ClientDetail, "slug" | "name">

export const COHORTS = [
  "All cohorts",
  "March cohort",
  "February cohort",
  "January cohort",
] as const

export type CohortFilter = (typeof COHORTS)[number]

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

export function createWorkspaceClientMemoryRepository({
  workspaceId,
  reader,
}: {
  workspaceId: string
  reader: ClientReaderPort
}): ClientMemoryRepositoryPort {
  return {
    async listClients() {
      return (await reader.listClients(workspaceId)).map(createClientDetail)
    },
    async getRecentClients(limit) {
      return (await reader.getRecentClients(workspaceId, limit)).map(
        createClientDetail
      )
    },
    async findClientBySlug(slug) {
      const profile = await reader.findClientBySlug({ workspaceId, slug })
      return profile ? createClientDetail(profile) : null
    },
  }
}

export function createClientDetail(profile: ClientProfile): ClientDetail {
  const timeline = sortTimelineEventsNewestFirst(profile.timeline)
  const sourceIds = new Set(
    profile.timeline.flatMap((event) =>
      event.sourceId ? [event.sourceId] : []
    )
  )
  const sourceTypes = new Set(
    profile.timeline.flatMap((event) =>
      event.sourceType && isConnectorId(event.sourceType)
        ? [event.sourceType]
        : []
    )
  )
  const sourceTags = CONNECTOR_METADATA.filter((connector) =>
    sourceTypes.has(connector.id)
  ).map((connector) => ({ icon: connector.icon, label: connector.title }))
  const status = coerceClientStatus(profile.status, profile.doNotContact)
  const flags = clientFlagsFor({
    status,
    doNotContact: profile.doNotContact,
    profileSensitivityLevel: profile.sensitivityLevel,
    timelineSensitivityLevels: profile.timeline.map(
      (event) => event.sensitivityLevel
    ),
  })
  const name = profile.displayName.trim() || profile.primaryEmail
  const cohort =
    profile.tags.find((tag) => tag.toLowerCase().includes("cohort")) ??
    "Imported"
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
        value:
          sourceTags.length > 0
            ? { kind: "source-tags", sources: sourceTags }
            : { kind: "text", value: "None" },
      },
    ],
    timeline,
  }
}

export function createClientSearchResult(
  profile: ClientProfile
): ClientSearchResult {
  const sourceIds = new Set(
    profile.timeline.flatMap((event) =>
      event.sourceId ? [event.sourceId] : []
    )
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
