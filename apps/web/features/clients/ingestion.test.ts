import { describe, expect, it } from "vitest"

import {
  previewConnectorRecords,
  syncConnectorRecords,
  type ClientIngestionWriterPort,
  type ConnectorIngestionPort,
  type NormalizedConnectorRecord,
} from "@/features/clients/application/connector-ingestion"

const record = (externalId: string): NormalizedConnectorRecord => ({
  workspaceId: "workspace_1",
  sourceId: "source_1",
  sourceType: "imap",
  externalId,
  recordType: "email",
  eventType: "email_received",
  occurredAt: "2026-05-07T08:00:00.000Z",
  title: "Replay access",
  summary: "Asked about replay access.",
  bodyText: "Could you resend the replay link?",
  participants: [{ email: "anna@example.com", role: "external" }],
  metadata: { folder: "INBOX" },
  attributes: [],
  sensitivityLevel: 0,
})

describe("connector ingestion core", () => {
  it("previews connector records without invoking persistence", async () => {
    const connector: ConnectorIngestionPort = {
      async preview(input) {
        expect(input).toMatchObject({ workspaceId: "workspace_1", limit: 1 })
        return { records: [record("one"), record("two")], truncated: false }
      },
      async sync() {
        throw new Error("preview should not call sync")
      },
    }
    const writer: ClientIngestionWriterPort = {
      async persist() {
        throw new Error("preview should not persist")
      },
    }

    await expect(
      previewConnectorRecords({
        connector,
        writer,
        input: { workspaceId: "workspace_1", sourceId: "source_1", limit: 1 },
      })
    ).resolves.toEqual({
      records: [record("one")],
      truncated: true,
    })
  })

  it("persists normalized records produced by connector sync", async () => {
    const persisted: NormalizedConnectorRecord[][] = []
    const connector: ConnectorIngestionPort = {
      async preview() {
        throw new Error("sync should not call preview")
      },
      async sync() {
        return { records: [record("one")], truncated: false, cursor: { done: true } }
      },
    }
    const writer: ClientIngestionWriterPort = {
      async persist(records) {
        persisted.push(records)
        return { clients: 1, rawRecords: 1, timelineEvents: 1 }
      },
    }

    await expect(
      syncConnectorRecords({
        connector,
        writer,
        input: { workspaceId: "workspace_1", sourceId: "source_1" },
      })
    ).resolves.toMatchObject({
      cursor: { done: true },
      persisted: { clients: 1, rawRecords: 1, timelineEvents: 1 },
    })
    expect(persisted).toEqual([[record("one")]])
  })

  it("rejects invalid connector sync records before invoking persistence", async () => {
    const connector: ConnectorIngestionPort = {
      async preview() {
        throw new Error("sync should not call preview")
      },
      async sync() {
        return {
          records: [
            {
              ...record("one"),
              externalId: "",
              sensitivityLevel: 9,
            } as unknown as NormalizedConnectorRecord,
          ],
          truncated: false,
        }
      },
    }
    const writer: ClientIngestionWriterPort = {
      async persist() {
        throw new Error("invalid records should not persist")
      },
    }

    await expect(
      syncConnectorRecords({
        connector,
        writer,
        input: { workspaceId: "workspace_1", sourceId: "source_1" },
      })
    ).rejects.toMatchObject({
      message: "ingestion_failed",
      cause: expect.objectContaining({
        message: "invalid_connector_record",
      }),
    })
  })
})
