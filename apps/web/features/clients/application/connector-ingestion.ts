import {
  assertValidNormalizedRecords,
  type NormalizedConnectorRecord,
} from "@/features/clients/domain/connector-record"
import type { Json } from "@/lib/database.types"

export type {
  ConnectorSourceType,
  NormalizedConnectorRecord,
  NormalizedParticipant,
} from "@/features/clients/domain/connector-record"

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

export type ClientIngestionWriterPort = {
  persist(
    records: NormalizedConnectorRecord[]
  ): Promise<PersistedConnectorRecords>
}

export async function previewConnectorRecords({
  connector,
  input,
}: {
  connector: ConnectorIngestionPort
  writer?: ClientIngestionWriterPort
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
  writer: ClientIngestionWriterPort
  input: ConnectorIngestionInput
}) {
  const result = await connector.sync(input)
  try {
    assertValidNormalizedRecords(result.records)
  } catch (cause) {
    throw new Error("ingestion_failed", { cause })
  }
  const persisted =
    result.records.length > 0
      ? await writer.persist(result.records)
      : { clients: 0, rawRecords: 0, timelineEvents: 0 }

  return {
    ...result,
    persisted,
  }
}
