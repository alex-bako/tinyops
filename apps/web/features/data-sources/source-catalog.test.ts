import { describe, expect, it } from "vitest"

import { composeWorkspaceSourceCatalog } from "@/features/data-sources/source-catalog"
import type { ImapDataSource } from "@/features/data-sources/types"

function imapSource(patch: Partial<ImapDataSource> = {}): ImapDataSource {
  return {
    id: "source_1",
    workspaceId: "workspace_1",
    type: "imap",
    displayName: "IMAP mailbox",
    status: "connected",
    configVersion: 1,
    config: {
      host: "imap.example.com",
      port: 993,
      encryption: "ssl",
      username: "hello@example.com",
      historyWindow: "12mo",
      watchedFolders: ["INBOX", "Clients"],
      skipSenders: ["*@noreply.*"],
    },
    secret: { purpose: "imap_password", maskedValue: "••••cret" },
    sync: {
      status: "queued",
      historyWindow: "12mo",
      cursor: null,
      lastError: null,
      lastSyncedAt: null,
    },
    createdAt: "2026-05-09T00:00:00.000Z",
    updatedAt: "2026-05-09T00:00:00.000Z",
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
      sourceRowId: "source_1",
      imap: {
        host: "imap.example.com",
        username: "hello@example.com",
        passwordMasked: "••••cret",
        watchedFolders: ["INBOX", "Clients"],
      },
      stats: [
        { id: "synced", label: "Sync", value: "Queued" },
        { id: "window", label: "Window", value: "12 months" },
        { id: "events", label: "Folders", value: "2" },
      ],
    })
  })
})
