import { describe, expect, it } from "vitest"

import {
  CONNECTOR_IDS,
  composeWorkspaceConnectorCatalog,
  getConnectorMetadata,
  listConnectorDefinitions,
} from "@/features/data-sources/connectors"
import type { ImapDataSource } from "@/features/data-sources/types"

function imapSource(): ImapDataSource {
  return {
    id: "source_1",
    workspaceId: "workspace_1",
    type: "imap",
    sourceSlug: "imap-mailbox",
    displayName: "IMAP mailbox",
    status: "connected",
    configVersion: 1,
    connection: {
      host: "imap.example.com",
      port: 993,
      encryption: "ssl",
      username: "hello@example.com",
    },
    intake: {
      historyWindow: "12mo",
      watchedFolders: ["INBOX"],
      skipSenders: [],
      messageFilters: { mode: "and", rules: [] },
    },
    folderSnapshot: {
      availableFolders: [{ path: "INBOX", messages: 1204 }],
    },
    secret: { purpose: "imap_password", maskedValue: "****cret" },
    sync: {
      status: "queued",
      cursor: null,
      lastError: null,
      lastSyncedAt: null,
    },
    createdAt: "2026-05-09T00:00:00.000Z",
    updatedAt: "2026-05-09T00:00:00.000Z",
  }
}

describe("data source connector platform", () => {
  it("keeps static connector definitions separate from workspace state", () => {
    const definitions = listConnectorDefinitions()

    expect(CONNECTOR_IDS).toEqual([
      "imap",
      "csv",
      "forms",
      "stripe",
      "mailerlite",
      "calendly",
      "teachable",
    ])
    expect(definitions).toHaveLength(7)
    expect(definitions[0]).toMatchObject({
      id: "imap",
      title: "IMAP mailbox",
      auth: "imap",
    })
    expect(definitions[0]).not.toHaveProperty("connected")
    expect(definitions[0]).not.toHaveProperty("imap")
    expect(getConnectorMetadata("forms")).toMatchObject({
      id: "forms",
    })
    expect(getConnectorMetadata("forms")).not.toHaveProperty("cardinality")
    expect(getConnectorMetadata("imap")).toMatchObject({
      id: "imap",
    })
    expect(getConnectorMetadata("imap")).not.toHaveProperty("cardinality")
  })

  it("composes runtime workspace state only for connected IMAP", () => {
    const catalog = composeWorkspaceConnectorCatalog([imapSource()])
    const imap = catalog.find((source) => source.id === "imap")
    const csv = catalog.find((source) => source.id === "csv")

    expect(imap).toMatchObject({
      id: "imap",
      kind: "data_source",
      connected: true,
      sourceId: "source_1",
      sourceType: "imap",
      sourceSlug: "imap-mailbox",
      imap: {
        username: "hello@example.com",
        watchedFolders: ["INBOX"],
        availableFolders: [{ path: "INBOX", messages: 1204 }],
      },
    })
    expect(csv).toMatchObject({
      id: "csv",
      kind: "connector_type",
      connected: false,
      stats: [],
    })
    expect(imap?.kind).toBe("data_source")
    if (imap?.kind !== "data_source") {
      throw new Error("expected connected IMAP data source")
    }
    expect(imap?.imap).not.toHaveProperty("syncUpdatedAt")
    expect(csv).not.toHaveProperty("imap")
    expect(imap).not.toHaveProperty("sourceRowId")
    expect(imap).not.toHaveProperty("sourceRowIds")
  })
})
