import {
  mapClientProfileToSearchResult,
  mapClientRowToProfile,
} from "@/features/clients/mappers"
import type {
  ClientReader,
  ClientRow,
  ClientSearchResult,
} from "@/features/clients/types"

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>
type SupabaseClientStoreClient = {
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
    raw_record_id,
    event_type,
    event_date,
    title,
    summary,
    body_text,
    participants,
    metadata,
    sensitivity_level,
    ai_extracted_fields,
    created_at,
    updated_at
  )
`

export function createSupabaseClientStore({
  client,
}: {
  client: SupabaseClientStoreClient
}): ClientReader {
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

      return rows.map((row) => mapClientProfileToSearchResult(mapClientRowToProfile(row)))
    },
  }
}

function baseClientQuery(client: SupabaseClientStoreClient): ClientQuery {
  return (client.from("clients") as ClientQuery).select(CLIENT_COLUMNS)
}

async function searchClientField({
  client,
  workspaceId,
  field,
  pattern,
  limit,
}: {
  client: SupabaseClientStoreClient
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
