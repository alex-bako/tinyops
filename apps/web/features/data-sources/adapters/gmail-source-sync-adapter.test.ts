import { describe, expect, it, vi } from "vitest"

import { createGmailSourceSyncAdapter } from "@/features/data-sources/adapters/gmail-source-sync-adapter"
import type { GmailCredentialReader } from "@/features/data-sources/gmail/gmail-secret-reader"
import type {
  DataSourceQueryPort,
  GmailDataSource,
  ImapDataSource,
  WorkspaceDataSource,
} from "@/features/data-sources/types"

const JOB = {
  sourceId: "source_1",
  workspaceId: "workspace_1",
  sourceType: "gmail" as const,
  leaseToken: "lease_1",
}

function gmailSource(): GmailDataSource {
  return {
    id: "source_1",
    workspaceId: "workspace_1",
    type: "gmail",
    sourceSlug: "primary-gmail",
    displayName: "Primary Gmail",
    status: "connected",
    configVersion: 1,
    connection: { emailAddress: "owner@gmail.com" },
    intake: {
      historyWindow: "90d",
      watchedFolders: ["INBOX", "SENT"],
      skipSenders: [],
      messageFilters: { mode: "and", rules: [] },
    },
    folderSnapshot: { availableFolders: [] },
    secret: { purpose: "gmail_oauth_refresh_token", maskedValue: "****oken" },
    sync: { status: "queued", cursor: null, lastError: null, lastSyncedAt: null },
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  }
}

function reader(source: WorkspaceDataSource | null): DataSourceQueryPort {
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

function credentialReader(
  result: Awaited<ReturnType<GmailCredentialReader["readAccessTokenForSync"]>>
): GmailCredentialReader {
  return { readAccessTokenForSync: vi.fn().mockResolvedValue(result) }
}

describe("createGmailSourceSyncAdapter", () => {
  it("prepares a connector for a claimed Gmail source", async () => {
    const connector = { preview: vi.fn(), sync: vi.fn() }
    const adapter = createGmailSourceSyncAdapter({
      dataSourceReader: reader(gmailSource()),
      gmailCredentialReader: credentialReader({ ok: true, value: "access-1" }),
      connectorFactory: () => connector,
    })

    const result = await adapter.prepare({ job: JOB })

    expect(result).toEqual({ ok: true, value: connector })
  })

  it("fails with source_not_found when no source is claimed", async () => {
    const adapter = createGmailSourceSyncAdapter({
      dataSourceReader: reader(null),
      gmailCredentialReader: credentialReader({ ok: true, value: "access-1" }),
    })

    const result = await adapter.prepare({ job: JOB })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe("source_not_found")
  })

  it("fails with source_not_found when the claimed source is not Gmail", async () => {
    const imap = { type: "imap" } as unknown as ImapDataSource
    const adapter = createGmailSourceSyncAdapter({
      dataSourceReader: reader(imap),
      gmailCredentialReader: credentialReader({ ok: true, value: "access-1" }),
    })

    const result = await adapter.prepare({ job: JOB })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe("source_not_found")
  })

  it("propagates a credential failure with job context", async () => {
    const adapter = createGmailSourceSyncAdapter({
      dataSourceReader: reader(gmailSource()),
      gmailCredentialReader: credentialReader({
        ok: false,
        error: { code: "gmail_auth_revoked", message: "revoked" },
      }),
    })

    const result = await adapter.prepare({ job: JOB })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe("gmail_auth_revoked")
    expect(result.error).toMatchObject({
      sourceId: "source_1",
      workspaceId: "workspace_1",
    })
  })
})
