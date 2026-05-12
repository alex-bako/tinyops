import { describe, expect, it } from "vitest"

import { createImapSourceSyncAdapter } from "@/features/data-sources/adapters/imap-source-sync-adapter"
import type { ConnectorIngestionPort } from "@/features/clients/application/connector-ingestion"
import type {
  DataSourceQueryPort,
  ImapDataSource,
} from "@/features/data-sources/types"

function imapSource(): ImapDataSource {
  return {
    id: "source_1",
    workspaceId: "workspace_1",
    type: "imap",
    displayName: "IMAP mailbox",
    sourceSlug: "imap-mailbox",
    status: "connected",
    configVersion: 1,
    connection: {
      host: "imap.example.com",
      port: 993,
      encryption: "ssl",
      username: "owner@example.com",
    },
    intake: {
      historyWindow: "90d",
      watchedFolders: ["INBOX"],
      skipSenders: [],
      messageFilters: { mode: "and", rules: [] },
    },
    folderSnapshot: { availableFolders: [] },
    secret: { purpose: "imap_password", maskedValue: "****cret" },
    sync: {
      status: "queued",
      cursor: null,
      lastError: null,
      lastSyncedAt: null,
    },
    createdAt: "2026-05-07T00:00:00.000Z",
    updatedAt: "2026-05-07T00:00:00.000Z",
  }
}

function reader(source: ImapDataSource | null): DataSourceQueryPort {
  return {
    async listForWorkspace() {
      throw new Error("unexpected list")
    },
    async findBySlugForWorkspace() {
      throw new Error("unexpected find by slug")
    },
    async findByIdForWorkspace() {
      return source
    },
  }
}

describe("IMAP source sync adapter", () => {
  it("loads the claimed source, reads the password, and prepares an IMAP connector", async () => {
    const calls: unknown[] = []
    const connector: ConnectorIngestionPort = {
      async preview() {
        throw new Error("unexpected preview")
      },
      async sync() {
        return { records: [], truncated: false, cursor: null }
      },
    }
    const adapter = createImapSourceSyncAdapter({
      dataSourceReader: reader(imapSource()),
      imapCredentialReader: {
        async readImapPasswordForSync(input) {
          calls.push({ method: "readImapPasswordForSync", input })
          return { ok: true, value: "top-secret" }
        },
      },
      manualReviewKeywordsForWorkspace: async (workspaceId) => {
        calls.push({ method: "manualReviewKeywordsForWorkspace", workspaceId })
        return ["trauma"]
      },
      connectorFactory(input) {
        calls.push({ method: "connectorFactory", input })
        return connector
      },
    })

    await expect(
      adapter.prepare({
        job: {
          sourceId: "source_1",
          workspaceId: "workspace_1",
          sourceType: "imap",
          leaseToken: "lease_1",
        },
      })
    ).resolves.toEqual({ ok: true, value: connector })
    expect(calls).toContainEqual({
      method: "readImapPasswordForSync",
      input: { workspaceId: "workspace_1", sourceId: "source_1" },
    })
    expect(calls).toContainEqual({
      method: "manualReviewKeywordsForWorkspace",
      workspaceId: "workspace_1",
    })
    expect(calls).toContainEqual({
      method: "connectorFactory",
      input: {
        source: imapSource(),
        password: "top-secret",
        manualReviewKeywords: ["trauma"],
      },
    })
  })

  it("returns source_not_found when the claimed source is unavailable", async () => {
    const adapter = createImapSourceSyncAdapter({
      dataSourceReader: reader(null),
      imapCredentialReader: {
        async readImapPasswordForSync() {
          throw new Error("missing source means no password read")
        },
      },
    })

    await expect(
      adapter.prepare({
        job: {
          sourceId: "source_1",
          workspaceId: "workspace_1",
          sourceType: "imap",
          leaseToken: "lease_1",
        },
      })
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "source_not_found",
        message: "Source not found",
        sourceId: "source_1",
        workspaceId: "workspace_1",
      },
    })
  })

  it("returns credential read failures with claimed job context", async () => {
    const adapter = createImapSourceSyncAdapter({
      dataSourceReader: reader(imapSource()),
      imapCredentialReader: {
        async readImapPasswordForSync() {
          return {
            ok: false,
            error: {
              code: "secret_read_failed",
              message: "Could not read IMAP password",
            },
          }
        },
      },
    })

    await expect(
      adapter.prepare({
        job: {
          sourceId: "source_1",
          workspaceId: "workspace_1",
          sourceType: "imap",
          leaseToken: "lease_1",
        },
      })
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "secret_read_failed",
        message: "Could not read IMAP password",
        sourceId: "source_1",
        workspaceId: "workspace_1",
      },
    })
  })
})
