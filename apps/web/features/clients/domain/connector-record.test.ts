import { describe, expect, it } from "vitest"

import {
  assertValidNormalizedRecords,
  isValidNormalizedRecord,
  type NormalizedConnectorRecord,
} from "@/features/clients/domain/connector-record"

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
    { email: "anna@example.com", role: "external" },
  ],
  metadata: { folder: "INBOX" },
  attributes: [{ key: "topic", value: "replay", confidence: 0.8 }],
  sensitivityLevel: 0,
}

describe("normalized connector record domain validation", () => {
  it("accepts valid connector records", () => {
    expect(isValidNormalizedRecord(record)).toBe(true)
    expect(() => assertValidNormalizedRecords([record])).not.toThrow()
  })

  it("rejects invalid event type, timestamp, sensitivity, and participant email", () => {
    const invalid = {
      ...record,
      eventType: "unknown",
      occurredAt: "not-a-date",
      participants: [{ email: "", role: "external" }],
      sensitivityLevel: 9,
    } as unknown as NormalizedConnectorRecord

    expect(isValidNormalizedRecord(invalid)).toBe(false)
    expect(() => assertValidNormalizedRecords([invalid])).toThrow(
      "invalid_connector_record"
    )
  })
})
