import { describe, expect, it } from "vitest"

import { composeWorkspaceSourceCatalog } from "@/features/data-sources/source-catalog"
import type {
  GoogleFormsDataSource,
  ImapDataSource,
} from "@/features/data-sources/types"

function imapSource(patch: Partial<ImapDataSource> = {}): ImapDataSource {
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
      watchedFolders: ["INBOX", "Clients"],
      skipSenders: ["*@noreply.*"],
      messageFilters: { mode: "and", rules: [] },
    },
    folderSnapshot: {
      availableFolders: [
        { path: "INBOX", messages: 1204 },
        { path: "Clients", messages: 412 },
      ],
    },
    secret: { purpose: "imap_password", maskedValue: "••••cret" },
    sync: {
      status: "queued",
      cursor: null,
      lastError: null,
      lastSyncedAt: null,
    },
    createdAt: "2026-05-09T00:00:00.000Z",
    updatedAt: "2026-05-09T00:00:00.000Z",
    ...patch,
  }
}

function googleFormsSource(
  patch: Partial<GoogleFormsDataSource> = {}
): GoogleFormsDataSource {
  return {
    id: "forms_source_1",
    workspaceId: "workspace_1",
    type: "forms",
    sourceSlug: "practice-intake",
    displayName: "Practice intake",
    status: "connected",
    configVersion: 1,
    externalFormId: "1AbC_Def-1234567890",
    connectionMode: "manual_csv",
    mapping: {
      identityColumn: "Email Address",
      timestampColumn: "Timestamp",
    },
    latestUpload: {
      id: "upload_1",
      fileName: "practice-intake.csv",
      rowCount: 42,
      uploadedAt: "2026-05-10T00:00:00.000Z",
    },
    sync: {
      status: "idle",
      cursor: null,
      lastError: null,
      lastSyncedAt: "2026-05-10T00:10:00.000Z",
    },
    syncRuns: [],
    createdAt: "2026-05-10T00:00:00.000Z",
    updatedAt: "2026-05-10T00:00:00.000Z",
    ...patch,
  }
}

describe("workspace source catalog", () => {
  it("marks catalog entries disconnected until workspace rows exist", () => {
    const catalog = composeWorkspaceSourceCatalog([])

    expect(catalog).toHaveLength(7)
    expect(catalog.every((source) => !source.connected)).toBe(true)
  })

  it("hydrates IMAP catalog state from workspace data source rows", () => {
    const catalog = composeWorkspaceSourceCatalog([imapSource()])
    const imap = catalog.find((source) => source.id === "imap")

    expect(imap).toMatchObject({
      id: "imap",
      kind: "data_source",
      connected: true,
      sub: "hello@example.com",
      health: "healthy",
      sourceId: "source_1",
      sourceType: "imap",
      sourceSlug: "imap-mailbox",
      imap: {
        host: "imap.example.com",
        username: "hello@example.com",
        passwordMasked: "••••cret",
        watchedFolders: ["INBOX", "Clients"],
        availableFolders: [
          { path: "INBOX", messages: 1204 },
          { path: "Clients", messages: 412 },
        ],
      },
      stats: [
        { id: "synced", label: "Sync", value: "Queued" },
        { id: "window", label: "Window", value: "12 months" },
        { id: "events", label: "Folders", value: "2" },
      ],
    })
  })

  it("returns one connected row per workspace source and keeps type entries available for add-new", () => {
    const catalog = composeWorkspaceSourceCatalog([
      imapSource({
        id: "source_1",
        displayName: "Primary inbox",
      }),
      imapSource({
        id: "source_2",
        sourceSlug: "support-inbox",
        displayName: "Support inbox",
        connection: {
          host: "imap.example.com",
          port: 993,
          encryption: "ssl",
          username: "support@example.com",
        },
      }),
      googleFormsSource(),
      googleFormsSource({
        id: "forms_source_2",
        sourceSlug: "monthly-check-in",
        displayName: "Monthly check-in",
        externalFormId: "1Monthly_CheckIn",
        latestUpload: {
          id: "upload_2",
          fileName: "monthly.csv",
          rowCount: 18,
          uploadedAt: "2026-05-11T00:00:00.000Z",
        },
      }),
    ])
    expect(
      catalog
        .filter((source) => source.connected)
        .map((source) => ({
          id: source.id,
          title: source.title,
          sourceId: source.kind === "data_source" ? source.sourceId : null,
          sourceType: source.kind === "data_source" ? source.sourceType : null,
          sourceSlug: source.kind === "data_source" ? source.sourceSlug : null,
        }))
    ).toEqual([
      {
        id: "imap",
        title: "Primary inbox",
        sourceId: "source_1",
        sourceType: "imap",
        sourceSlug: "imap-mailbox",
      },
      {
        id: "imap",
        title: "Support inbox",
        sourceId: "source_2",
        sourceType: "imap",
        sourceSlug: "support-inbox",
      },
      {
        id: "forms",
        title: "Practice intake",
        sourceId: "forms_source_1",
        sourceType: "forms",
        sourceSlug: "practice-intake",
      },
      {
        id: "forms",
        title: "Monthly check-in",
        sourceId: "forms_source_2",
        sourceType: "forms",
        sourceSlug: "monthly-check-in",
      },
    ])

    expect(
      catalog.filter((source) => !source.connected).map((source) => source.id)
    ).toEqual([
      "imap",
      "csv",
      "forms",
      "stripe",
      "mailerlite",
      "calendly",
      "teachable",
    ])
  })
})
