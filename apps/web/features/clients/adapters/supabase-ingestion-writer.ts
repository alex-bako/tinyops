import type { ClientIngestionWriterPort } from "@/features/clients/application/connector-ingestion"
import {
  assertValidNormalizedRecords,
  type NormalizedConnectorRecord,
} from "@/features/clients/domain/connector-record"

type RpcResult = {
  data: unknown
  error: { message: string } | null
}

export type SupabaseClientIngestionWriterClient = {
  rpc(fn: string, args: unknown): PromiseLike<RpcResult>
}

const EMPTY_PERSISTED_RECORDS = {
  clients: 0,
  rawRecords: 0,
  timelineEvents: 0,
}

export function createSupabaseClientIngestionWriter({
  client,
}: {
  client: SupabaseClientIngestionWriterClient
}): ClientIngestionWriterPort {
  return {
    async persist(records: NormalizedConnectorRecord[]) {
      if (records.length === 0) return EMPTY_PERSISTED_RECORDS
      try {
        assertValidNormalizedRecords(records)
      } catch (cause) {
        throw new Error("ingestion_failed", { cause })
      }

      const { data, error } = await client.rpc(
        "ingest_client_connector_records",
        {
          normalized_records: records,
        }
      )
      if (error) throw new Error("ingestion_failed", { cause: error })

      return persistedCounts(data)
    },
  }
}

function persistedCounts(data: unknown) {
  if (!data || typeof data !== "object") return EMPTY_PERSISTED_RECORDS
  const value = data as Record<string, unknown>

  return {
    clients: numberField(value.clients),
    rawRecords: numberField(value.rawRecords ?? value.raw_records),
    timelineEvents: numberField(value.timelineEvents ?? value.timeline_events),
  }
}

function numberField(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}
