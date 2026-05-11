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
      connected: true,
      sub: "hello@example.com",
      health: "healthy",
      sourceRowIds: ["source_1"],
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

  it("aggregates multiple Google Forms manual CSV sources under one connector", () => {
    const catalog = composeWorkspaceSourceCatalog([
      googleFormsSource(),
      googleFormsSource({
        id: "forms_source_2",
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
    const forms = catalog.find((source) => source.id === "forms")

    expect(forms).toMatchObject({
      id: "forms",
      connected: true,
      sub: "2 forms connected",
      sourceRowIds: ["forms_source_2", "forms_source_1"],
      summaryStatId: "submissions",
      stats: [
        { id: "submissions", label: "Responses", value: "60" },
        { id: "events", label: "Forms", value: "2" },
        { id: "synced", label: "Sync", value: "Synced" },
      ],
      forms: {
        connections: [
          {
            sourceRowId: "forms_source_2",
            displayName: "Monthly check-in",
            externalFormId: "1Monthly_CheckIn",
            connectionMode: "manual_csv",
            latestUpload: {
              fileName: "monthly.csv",
              rowCount: 18,
            },
          },
          {
            sourceRowId: "forms_source_1",
            displayName: "Practice intake",
            externalFormId: "1AbC_Def-1234567890",
            connectionMode: "manual_csv",
            latestUpload: {
              fileName: "practice-intake.csv",
              rowCount: 42,
            },
          },
        ],
      },
    })
  })
})
