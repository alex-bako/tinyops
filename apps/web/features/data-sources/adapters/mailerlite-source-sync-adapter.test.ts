import { describe, expect, it } from "vitest"

import { createMailerLiteSourceSyncAdapter } from "@/features/data-sources/adapters/mailerlite-source-sync-adapter"
import type {
  DataSourceQueryPort,
  MailerLiteApiPort,
  MailerLiteDataSource,
} from "@/features/data-sources/types"

function source(): MailerLiteDataSource {
  return {
    id: "mailerlite_source_1",
    workspaceId: "workspace_1",
    type: "mailerlite",
    sourceSlug: "shop",
    displayName: "Shop",
    status: "connected",
    configVersion: 1,
    accountId: "shop_1",
    shops: [{ id: "shop_1", name: "Shop", currency: "USD" }],
    syncFrom: "2026-01-01T00:00:00.000Z",
    secret: { purpose: "mailerlite_api_key", maskedValue: "****abcd" },
    sync: { status: "queued", cursor: null, lastError: null, lastSyncedAt: null },
    syncRuns: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  }
}

function reader(found: MailerLiteDataSource | null): DataSourceQueryPort {
  return {
    async listForWorkspace() {
      throw new Error("unexpected list")
    },
    async findBySlugForWorkspace() {
      throw new Error("unexpected find by slug")
    },
    async findByIdForWorkspace() {
      return found
    },
  }
}

const job = {
  sourceId: "mailerlite_source_1",
  workspaceId: "workspace_1",
  sourceType: "mailerlite" as const,
  leaseToken: "lease_1",
}

describe("MailerLite source sync adapter", () => {
  it("reads the stored key and builds a connector with an API client for it", async () => {
    const keys: string[] = []
    const factoryCalls: unknown[] = []
    const api = {} as MailerLiteApiPort
    const adapter = createMailerLiteSourceSyncAdapter({
      dataSourceReader: reader(source()),
      secretReader: {
        async readMailerLiteApiKey(input) {
          keys.push(`${input.workspaceId}:${input.sourceId}`)
          return { ok: true, value: "ml_secret_key" }
        },
      },
      apiFactory: (apiKey) => {
        factoryCalls.push(apiKey)
        return api
      },
      connectorFactory: (input) => {
        factoryCalls.push(input)
        return { preview: async () => ({ records: [], truncated: false }), sync: async () => ({ records: [], truncated: false }) }
      },
    })

    const result = await adapter.prepare({ job })

    expect(result.ok).toBe(true)
    expect(keys).toEqual(["workspace_1:mailerlite_source_1"])
    expect(factoryCalls).toEqual(["ml_secret_key", { source: source(), api }])
  })

  it("fails when the source is missing or the secret cannot be read", async () => {
    const missing = await createMailerLiteSourceSyncAdapter({
      dataSourceReader: reader(null),
      secretReader: {
        async readMailerLiteApiKey() {
          throw new Error("unexpected secret read")
        },
      },
    }).prepare({ job })
    expect(missing).toMatchObject({ ok: false, error: { code: "source_not_found" } })

    const unreadable = await createMailerLiteSourceSyncAdapter({
      dataSourceReader: reader(source()),
      secretReader: {
        async readMailerLiteApiKey() {
          return {
            ok: false,
            error: { code: "secret_read_failed", message: "Could not read stored credential" },
          }
        },
      },
    }).prepare({ job })
    expect(unreadable).toMatchObject({ ok: false, error: { code: "secret_read_failed" } })
  })
})
