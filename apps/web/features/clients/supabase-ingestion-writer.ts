import type {
  ClientIngestionWriter,
  NormalizedConnectorRecord,
  PersistedConnectorRecords,
} from "@/features/clients/ingestion"

type RpcResult = {
  data: unknown
  error: { message: string } | null
}

export type SupabaseClientIngestionWriterClient = {
  rpc(fn: string, args: unknown): PromiseLike<RpcResult>
}

const EMPTY_PERSISTED_RECORDS: PersistedConnectorRecords = {
  clients: 0,
  rawRecords: 0,
  timelineEvents: 0,
}

export function createSupabaseClientIngestionWriter({
  client,
}: {
  client: SupabaseClientIngestionWriterClient
}): ClientIngestionWriter {
  return {
    async persist(records: NormalizedConnectorRecord[]) {
      if (records.length === 0) return EMPTY_PERSISTED_RECORDS
      assertValidNormalizedRecords(records)

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

function assertValidNormalizedRecords(records: NormalizedConnectorRecord[]) {
  for (const record of records) {
    if (!isValidNormalizedRecord(record)) {
      throw new Error("ingestion_failed", {
        cause: new Error("invalid_connector_record"),
      })
    }
  }
}

function isValidNormalizedRecord(record: NormalizedConnectorRecord) {
  return (
    nonEmpty(record.workspaceId) &&
    nonEmpty(record.sourceId) &&
    nonEmpty(record.sourceType) &&
    nonEmpty(record.externalId) &&
    nonEmpty(record.recordType) &&
    validEventType(record.eventType) &&
    nonEmpty(record.occurredAt) &&
    !Number.isNaN(Date.parse(record.occurredAt)) &&
    nonEmpty(record.title) &&
    Array.isArray(record.participants) &&
    record.participants.every((participant) =>
      participant.role === "external"
        ? nonEmpty(participant.email)
        : nonEmpty(participant.email) &&
          (participant.role === "owner" || participant.role === "unknown")
    ) &&
    Array.isArray(record.attributes) &&
    record.attributes.every((attribute) => nonEmpty(attribute.key)) &&
    Number.isInteger(record.sensitivityLevel) &&
    record.sensitivityLevel >= 0 &&
    record.sensitivityLevel <= 4
  )
}

function nonEmpty(value: string) {
  return value.trim().length > 0
}

function validEventType(value: string) {
  return (
    value === "email_received" ||
    value === "email_sent" ||
    value === "form_submission" ||
    value === "csv_import_row" ||
    value === "manual_note" ||
    value === "tinyops_email" ||
    value === "system_event"
  )
}

function persistedCounts(data: unknown): PersistedConnectorRecords {
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
