import { describe, expect, it } from "vitest"

import { createSupabaseClientIngestionWriter } from "@/features/clients/supabase-ingestion-writer"
import type { NormalizedConnectorRecord } from "@/features/clients/ingestion"

const record: NormalizedConnectorRecord = {
  workspaceId: "workspace_1",
  sourceId: "source_1",
  sourceType: "imap",
  externalId: "message:<m1@example.com>",
  recordType: "email",
  eventType: "email_received",
  occurredAt: "2026-05-07T08:00:00.000Z",
  title: "Replay access",
  summary: "Asked about replay access.",
  bodyText: "Could you resend the replay link?",
  participants: [
    { email: "owner@example.com", role: "owner" },
    { email: "anna@example.com", name: "Anna", role: "external" },
  ],
  metadata: { folder: "INBOX" },
  attributes: [{ key: "topic", value: "replay", confidence: 0.8 }],
  sensitivityLevel: 0,
}

describe("supabase client ingestion writer", () => {
  it("persists normalized connector records through one transactional RPC", async () => {
    const calls: unknown[] = []
    const writer = createSupabaseClientIngestionWriter({
      client: {
        async rpc(fn: string, args: unknown) {
          calls.push({ fn, args })
          return {
            data: { clients: 1, rawRecords: 1, timelineEvents: 1 },
            error: null,
          }
        },
      },
    })

    await expect(writer.persist([record])).resolves.toEqual({
      clients: 1,
      rawRecords: 1,
      timelineEvents: 1,
    })
    expect(calls).toEqual([
      {
        fn: "ingest_client_connector_records",
        args: { normalized_records: [record] },
      },
    ])
  })

  it("short-circuits empty batches without touching storage", async () => {
    const writer = createSupabaseClientIngestionWriter({
      client: {
        async rpc() {
          throw new Error("empty batches should not call rpc")
        },
      },
    })

    await expect(writer.persist([])).resolves.toEqual({
      clients: 0,
      rawRecords: 0,
      timelineEvents: 0,
    })
  })

  it("maps RPC persistence errors to ingestion_failed with the storage cause", async () => {
    const cause = { message: "column reference record_type is ambiguous" }
    const writer = createSupabaseClientIngestionWriter({
      client: {
        async rpc() {
          return { data: null, error: cause }
        },
      },
    })

    await expect(writer.persist([record])).rejects.toMatchObject({
      message: "ingestion_failed",
      cause,
    })
  })

  it("rejects invalid normalized records before calling the ingestion RPC", async () => {
    const writer = createSupabaseClientIngestionWriter({
      client: {
        async rpc() {
          throw new Error("invalid records should not call rpc")
        },
      },
    })
    const invalidRecord = {
      ...record,
      externalId: "",
      participants: [{ email: "", role: "external" }],
      sensitivityLevel: 9,
    } as unknown as NormalizedConnectorRecord

    await expect(writer.persist([invalidRecord])).rejects.toMatchObject({
      message: "ingestion_failed",
      cause: expect.objectContaining({
        message: "invalid_connector_record",
      }),
    })
  })
})
