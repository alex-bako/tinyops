import {
  clientFlagsFor,
  coerceClientStatus,
  sortTimelineEventsNewestFirst,
  type ClientFlag,
  type ClientProfile,
  type ClientProperty,
  type ClientPropertyValue,
  type ClientReaderPort,
  type ClientSearchResult,
  type ClientStatus,
  type ClientTimelineEvent,
  type PropertyIcon,
  type PropertyStatusKind,
  type PropertyType,
} from "@/features/clients/domain/client-profile"

export { type ClientFlag, type ClientSearchResult, type ClientStatus }

// Property types live in the domain; re-exported here so existing UI imports
// from `@/features/clients/application/client-memory` keep resolving.
export type {
  ClientProperty,
  ClientPropertyValue,
  PropertyIcon,
  PropertyStatusKind,
  PropertyType,
}

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

export type ClientDetail = Client & {
  id: string
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
    id: profile.id,
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
    properties: profile.properties,
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

function formatDate(value: string | null): string {
  if (!value) return "Unknown"
  return DATE_FORMATTER.format(new Date(value))
}
