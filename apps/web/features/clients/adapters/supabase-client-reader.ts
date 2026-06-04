import { createClientSearchResult } from "@/features/clients/application/client-memory"
import type {
  ClientProfile,
  ClientProperty,
  ClientReaderPort,
  ClientSearchResult,
  ClientTimelineEntry,
} from "@/features/clients/domain/client-profile"
import {
  clientPropertyValueFromStored,
  coercePropertyIcon,
  coercePropertyType,
  mapTimelineEntryToEvent,
} from "@/features/clients/domain/client-profile"
import type { Json } from "@/lib/database.types"

export type ClientTimelineEventRow = {
  id: string
  workspace_id: string
  client_id: string
  source_id: string | null
  source?: {
    display_name: string | null
    source_type: string | null
  } | null
  raw_record_id: string | null
  event_type: string
  event_date: string
  body: Json
  participants: Json
  metadata: Json
  sensitivity_level: number
  ai_extracted_fields: Json
  parent_event_id: string | null
  created_by: string | null
  author?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
  created_at: string
  updated_at: string
}

export type ClientPropertyRow = {
  id: string
  name: string
  icon: string
  type: string
  value: Json
  position: number
}

export type ClientRow = {
  id: string
  workspace_id: string
  primary_email: string
  display_name: string
  slug: string
  status: string
  tags: string[]
  first_seen_at: string | null
  last_seen_at: string | null
  last_contacted_at: string | null
  do_not_contact: boolean
  unsubscribe_status: string
  consent_status: string
  sensitivity_level: number
  created_at: string
  updated_at: string
  timeline_events?: ClientTimelineEventRow[] | null
  client_properties?: ClientPropertyRow[] | null
}

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>
type SupabaseClientReaderClient = {
  from(table: string): unknown
}

type ClientQuery = {
  select(columns: string): ClientQuery
  eq(column: string, value: unknown): ClientQuery
  ilike(column: string, pattern: string): ClientQuery
  order(column: string, options?: unknown): ClientQuery
  limit(count: number): QueryResult<ClientRow[]>
  maybeSingle(): QueryResult<ClientRow>
}

const CLIENT_COLUMNS = `
  id,
  workspace_id,
  primary_email,
  display_name,
  slug,
  status,
  tags,
  first_seen_at,
  last_seen_at,
  last_contacted_at,
  do_not_contact,
  unsubscribe_status,
  consent_status,
  sensitivity_level,
  created_at,
  updated_at,
  timeline_events (
    id,
    workspace_id,
    client_id,
    source_id,
    source:data_sources (
      display_name,
      source_type
    ),
    raw_record_id,
    event_type,
    event_date,
    body,
    participants,
    metadata,
    sensitivity_level,
    ai_extracted_fields,
    parent_event_id,
    created_by,
    author:profiles!timeline_events_created_by_fkey (
      id,
      first_name,
      last_name,
      email
    ),
    created_at,
    updated_at
  ),
  client_properties (
    id,
    name,
    icon,
    type,
    value,
    position
  )
`

export function createSupabaseClientReader({
  client,
}: {
  client: SupabaseClientReaderClient
}): ClientReaderPort {
  return {
    async listClients(workspaceId) {
      const { data, error } = await baseClientQuery(client)
        .eq("workspace_id", workspaceId)
        .order("last_seen_at", { ascending: false, nullsFirst: false })
        .limit(500)

      if (error) throw new Error("Could not load clients", { cause: error })
      return ((data ?? []) as ClientRow[]).map(mapClientRowToProfile)
    },

    async getRecentClients(workspaceId, limit = 5) {
      const { data, error } = await baseClientQuery(client)
        .eq("workspace_id", workspaceId)
        .order("last_seen_at", { ascending: false, nullsFirst: false })
        .limit(limit)

      if (error) throw new Error("Could not load recent clients", { cause: error })
      return ((data ?? []) as ClientRow[]).map(mapClientRowToProfile)
    },

    async findClientBySlug(input) {
      const { data, error } = await baseClientQuery(client)
        .eq("workspace_id", input.workspaceId)
        .eq("slug", input.slug)
        .maybeSingle()

      if (error) throw new Error("Could not load client", { cause: error })
      return data ? mapClientRowToProfile(data as ClientRow) : null
    },

    async searchClients(input): Promise<ClientSearchResult[]> {
      const pattern = `%${escapeIlikePattern(input.query)}%`
      const [emailResult, nameResult] = await Promise.all([
        searchClientField({
          client,
          workspaceId: input.workspaceId,
          field: "primary_email",
          pattern,
          limit: input.limit,
        }),
        searchClientField({
          client,
          workspaceId: input.workspaceId,
          field: "display_name",
          pattern,
          limit: input.limit,
        }),
      ])

      const rows = dedupeClientRows([
        ...(emailResult ?? []),
        ...(nameResult ?? []),
      ]).slice(0, input.limit)

      return rows.map((row) => createClientSearchResult(mapClientRowToProfile(row)))
    },
  }
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
    timeline: (row.timeline_events ?? []).map((event) =>
      mapTimelineEntryToEvent(mapTimelineEventRow(event))
    ),
    properties: (row.client_properties ?? [])
      .map(mapClientPropertyRow)
      .sort((a, b) => a.position - b.position),
  }
}

function mapClientPropertyRow(row: ClientPropertyRow): ClientProperty {
  const type = coercePropertyType(row.type)
  return {
    id: row.id,
    name: row.name,
    icon: coercePropertyIcon(row.icon),
    type,
    value: clientPropertyValueFromStored(type, row.value),
    position: row.position,
  }
}

function mapTimelineEventRow(row: ClientTimelineEventRow): ClientTimelineEntry {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    clientId: row.client_id,
    sourceId: row.source_id,
    sourceType: row.source?.source_type ?? null,
    rawRecordId: row.raw_record_id,
    eventType: row.event_type,
    occurredAt: row.event_date,
    body: row.body,
    participants: row.participants,
    metadata: timelineEventMetadata(row),
    sensitivityLevel: row.sensitivity_level,
    aiExtractedFields: row.ai_extracted_fields,
    parentEventId: row.parent_event_id,
    createdBy: row.created_by,
    createdByProfile: row.author
      ? {
          firstName: row.author.first_name,
          lastName: row.author.last_name,
          email: row.author.email,
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function timelineEventMetadata(row: ClientTimelineEventRow): Json {
  const sourceDisplayName = row.source?.display_name?.trim()
  if (!sourceDisplayName) return row.metadata
  if (!row.metadata || typeof row.metadata !== "object" || Array.isArray(row.metadata)) {
    return { sourceDisplayName } satisfies Json
  }
  return {
    sourceDisplayName,
    ...row.metadata,
  } satisfies Json
}

function baseClientQuery(client: SupabaseClientReaderClient): ClientQuery {
  return (client.from("clients") as ClientQuery).select(CLIENT_COLUMNS)
}

async function searchClientField({
  client,
  workspaceId,
  field,
  pattern,
  limit,
}: {
  client: SupabaseClientReaderClient
  workspaceId: string
  field: "primary_email" | "display_name"
  pattern: string
  limit: number
}) {
  const { data, error } = await baseClientQuery(client)
    .eq("workspace_id", workspaceId)
    .ilike(field, pattern)
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) throw new Error("Could not search clients", { cause: error })
  return (data ?? []) as ClientRow[]
}

function dedupeClientRows(rows: ClientRow[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values())
}

function escapeIlikePattern(value: string) {
  return value.replace(/[\\%_(),]/g, "\\$&")
}
