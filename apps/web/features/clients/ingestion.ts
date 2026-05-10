import type { Json } from "@/lib/database.types"

export type ConnectorSourceType =
  | "imap"
  | "csv"
  | "forms"
  | "stripe"
  | "mailerlite"
  | "calendly"
  | "teachable"

export type NormalizedParticipantRole = "owner" | "external" | "unknown"

export type NormalizedParticipant = {
  email: string
  name?: string | null
  role: NormalizedParticipantRole
}

export type NormalizedClientAttribute = {
  key: string
  value: Json
  confidence?: number
}

export type NormalizedConnectorRecord = {
  workspaceId: string
  sourceId: string
  sourceType: ConnectorSourceType
  externalId: string
  recordType: string
  eventType:
    | "email_received"
    | "email_sent"
    | "form_submission"
    | "csv_import_row"
    | "manual_note"
    | "tinyops_email"
    | "system_event"
  occurredAt: string
  title: string
  summary: string
  bodyText: string
  participants: NormalizedParticipant[]
  metadata: Json
  attributes: NormalizedClientAttribute[]
  sensitivityLevel: 0 | 1 | 2 | 3 | 4
}

export type ConnectorIngestionInput = {
  workspaceId: string
  sourceId: string
  limit?: number
}

export type ConnectorIngestionResult = {
  records: NormalizedConnectorRecord[]
  truncated: boolean
  cursor?: Json
  diagnostics?: Json
}

export type ConnectorIngestionPort = {
  preview(input: ConnectorIngestionInput): Promise<ConnectorIngestionResult>
  sync(input: ConnectorIngestionInput): Promise<ConnectorIngestionResult>
}

export type PersistedConnectorRecords = {
  clients: number
  rawRecords: number
  timelineEvents: number
}

export type ClientIngestionWriter = {
  persist(
    records: NormalizedConnectorRecord[]
  ): Promise<PersistedConnectorRecords>
}

export async function previewConnectorRecords({
  connector,
  input,
}: {
  connector: ConnectorIngestionPort
  writer?: ClientIngestionWriter
  input: ConnectorIngestionInput
}): Promise<ConnectorIngestionResult> {
  const result = await connector.preview(input)
  const limit = input.limit ?? result.records.length
  const records = result.records.slice(0, limit)

  return {
    records,
    truncated: result.truncated || result.records.length > records.length,
    cursor: result.cursor,
  }
}

export async function syncConnectorRecords({
  connector,
  writer,
  input,
}: {
  connector: ConnectorIngestionPort
  writer: ClientIngestionWriter
  input: ConnectorIngestionInput
}) {
  const result = await connector.sync(input)
  const persisted =
    result.records.length > 0
      ? await writer.persist(result.records)
      : { clients: 0, rawRecords: 0, timelineEvents: 0 }

  return {
    ...result,
    persisted,
  }
}
