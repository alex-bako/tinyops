import type { Json } from "@/lib/database.types"

export type ClientStatus = "active" | "inactive" | "sensitive" | "dnc"

export type ClientTimelineEventRow = {
  id: string
  workspace_id: string
  client_id: string
  source_id: string | null
  raw_record_id: string | null
  event_type: string
  event_date: string
  title: string
  summary: string
  body_text: string
  participants: Json
  metadata: Json
  sensitivity_level: number
  ai_extracted_fields: Json
  created_at: string
  updated_at: string
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
}

export type ClientTimelineEntry = {
  id: string
  workspaceId: string
  clientId: string
  sourceId: string | null
  rawRecordId: string | null
  eventType: string
  occurredAt: string
  title: string
  summary: string
  bodyText: string
  participants: Json
  metadata: Json
  sensitivityLevel: number
  aiExtractedFields: Json
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
  timeline: ClientTimelineEntry[]
}

export type ClientSearchResult = {
  id: string
  slug: string
  name: string
  email: string
  lastInteractionAt: string | null
  sourceCount: number
}

export type ClientReader = {
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
