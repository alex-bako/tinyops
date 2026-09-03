import { describe, expect, it } from "vitest"

import { createStripeSourceSyncAdapter } from "@/features/data-sources/adapters/stripe-source-sync-adapter"
import type {
  DataSourceQueryPort,
  StripeApiPort,
  StripeDataSource,
} from "@/features/data-sources/types"

function source(): StripeDataSource {
  return {
    id: "stripe_source_1",
    workspaceId: "workspace_1",
    type: "stripe",
    sourceSlug: "shop",
    displayName: "Shop",
    status: "connected",
    configVersion: 1,
    accountId: "acct_1",
    syncFrom: "2026-01-01T00:00:00.000Z",
    livemode: true,
    secret: { purpose: "stripe_api_key", maskedValue: "****abcd" },
    sync: { status: "queued", cursor: null, lastError: null, lastSyncedAt: null },
    syncRuns: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  }
}

function reader(found: StripeDataSource | null): DataSourceQueryPort {
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
  sourceId: "stripe_source_1",
  workspaceId: "workspace_1",
  sourceType: "stripe" as const,
  leaseToken: "lease_1",
}

describe("Stripe source sync adapter", () => {
  it("reads the stored key and builds a connector with an API client for it", async () => {
    const keys: string[] = []
    const factoryCalls: unknown[] = []
    const api = {} as StripeApiPort
    const adapter = createStripeSourceSyncAdapter({
      dataSourceReader: reader(source()),
      secretReader: {
        async readStripeApiKey(input) {
          keys.push(`${input.workspaceId}:${input.sourceId}`)
          return { ok: true, value: "sk_live_secret" }
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
    expect(keys).toEqual(["workspace_1:stripe_source_1"])
    expect(factoryCalls).toEqual(["sk_live_secret", { source: source(), api }])
  })

  it("fails when the source is missing or the secret cannot be read", async () => {
    const missing = await createStripeSourceSyncAdapter({
      dataSourceReader: reader(null),
      secretReader: {
        async readStripeApiKey() {
          throw new Error("unexpected secret read")
        },
      },
    }).prepare({ job })
    expect(missing).toMatchObject({ ok: false, error: { code: "source_not_found" } })

    const unreadable = await createStripeSourceSyncAdapter({
      dataSourceReader: reader(source()),
      secretReader: {
        async readStripeApiKey() {
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
