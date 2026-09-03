import { describe, expect, it } from "vitest"

import { createStripeConnector, stripeCursor } from "./stripe-sync"
import type { StripeApiPort, StripeDataSource } from "./types"

function source(cursor: Record<string, unknown> | null = null): StripeDataSource {
  return {
    id: "source_1",
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
    sync: { status: "running", cursor, lastError: null, lastSyncedAt: null },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  }
}

function api(
  pages: Record<string, Array<{ data: unknown[]; hasMore: boolean }>>,
  calls: unknown[] = []
): StripeApiPort {
  return {
    async getAccount() {
      throw new Error("unexpected account read")
    },
    async list(resource, params) {
      calls.push({ resource, params })
      return pages[resource]?.shift() ?? { data: [], hasMore: false }
    },
    async getCustomer(id) {
      calls.push({ customer: id })
      return id === "cus_known" ? { id, email: "known@example.com" } : null
    },
  }
}

const input = { workspaceId: "workspace_1", sourceId: "source_1", limit: 2 }

describe("Stripe connector", () => {
  it("starts with customers from the sync start date and pages with starting_after", async () => {
    const calls: unknown[] = []
    const connector = createStripeConnector({
      source: source(),
      api: api(
        {
          customers: [
            {
              data: [
                { id: "cus_2", object: "customer", email: "b@example.com", created: 20 },
                { id: "cus_1", object: "customer", email: "a@example.com", created: 10 },
              ],
              hasMore: true,
            },
          ],
        },
        calls
      ),
    })

    const result = await connector.sync(input)

    expect(calls).toEqual([
      {
        resource: "customers",
        params: {
          limit: 2,
          starting_after: undefined,
          expand: [],
          "created[gte]": 1_767_225_600,
        },
      },
    ])
    expect(result.records.map((record) => record.externalId)).toEqual([
      "stripe:customer:cus_2",
      "stripe:customer:cus_1",
    ])
    expect(result.truncated).toBe(true)
    expect(result.cursor).toEqual({
      stripe: { phase: "customer", startingAfter: "cus_1", since: {}, maxSeen: 20 },
    })
  })

  it("advances phases, records the max created per phase, and skips objects without email", async () => {
    const calls: unknown[] = []
    const connector = createStripeConnector({
      source: source({
        stripe: { phase: "charge", startingAfter: null, since: { customer: 20 }, maxSeen: null },
      }),
      api: api(
        {
          charges: [
            {
              data: [
                {
                  id: "ch_1",
                  object: "charge",
                  amount: 100,
                  currency: "usd",
                  status: "succeeded",
                  created: 50,
                  customer: "cus_known",
                },
                {
                  id: "ch_0",
                  object: "charge",
                  amount: 100,
                  currency: "usd",
                  status: "succeeded",
                  created: 40,
                  customer: "cus_missing",
                },
              ],
              hasMore: false,
            },
          ],
        },
        calls
      ),
    })

    const result = await connector.sync(input)

    expect(calls[0]).toMatchObject({
      resource: "charges",
      params: { "created[gte]": 1_767_225_600, expand: ["data.customer"] },
    })
    expect(calls.slice(1)).toEqual([{ customer: "cus_known" }, { customer: "cus_missing" }])
    expect(result.records).toHaveLength(1)
    expect(result.records[0]?.participants).toEqual([
      { email: "known@example.com", name: null, role: "external" },
    ])
    expect(result.diagnostics).toMatchObject({ phase: "charge", skippedWithoutEmail: 1 })
    expect(result.truncated).toBe(true)
    expect(result.cursor).toEqual({
      stripe: {
        phase: "refund",
        startingAfter: null,
        since: { customer: 20, charge: 50 },
        maxSeen: null,
      },
    })
  })

  it("uses created[gt] on later runs and lists subscriptions of every status", async () => {
    const calls: unknown[] = []
    const connector = createStripeConnector({
      source: source({
        stripe: { phase: "subscription", startingAfter: null, since: { subscription: 99 }, maxSeen: null },
      }),
      api: api({}, calls),
    })

    const result = await connector.sync(input)

    expect(calls[0]).toMatchObject({
      resource: "subscriptions",
      params: { "created[gt]": 99, status: "all" },
    })
    expect(result.cursor).toMatchObject({ stripe: { phase: "events", since: { subscription: 99 } } })
  })

  it("arms the events watermark on the first pass and replays event objects afterwards", async () => {
    const first = await createStripeConnector({
      source: source({ stripe: { phase: "events", startingAfter: null, since: {}, maxSeen: null } }),
      api: api({}),
      now: () => 1_000_000 * 1000,
    }).sync(input)
    expect(first.records).toEqual([])
    expect(first.truncated).toBe(false)
    expect(first.cursor).toEqual({
      stripe: { phase: "customer", startingAfter: null, since: { events: 1_000_000 }, maxSeen: null },
    })

    const calls: unknown[] = []
    const second = await createStripeConnector({
      source: source({
        stripe: { phase: "events", startingAfter: null, since: { events: 1_000_000 }, maxSeen: null },
      }),
      api: api(
        {
          events: [
            {
              data: [
                {
                  id: "evt_1",
                  type: "customer.subscription.deleted",
                  created: 1_000_500,
                  data: {
                    object: {
                      id: "sub_1",
                      object: "subscription",
                      status: "canceled",
                      created: 5,
                      canceled_at: 1_000_400,
                      customer: { id: "cus_1", email: "a@example.com" },
                    },
                  },
                },
              ],
              hasMore: false,
            },
          ],
        },
        calls
      ),
    }).sync(input)

    expect(calls[0]).toMatchObject({
      resource: "events",
      params: { "created[gt]": 1_000_000, types: expect.arrayContaining(["customer.subscription.deleted"]) },
    })
    expect(second.records[0]).toMatchObject({
      externalId: "stripe:subscription:sub_1",
      metadata: { status: "canceled" },
    })
    expect(second.cursor).toEqual({
      stripe: { phase: "customer", startingAfter: null, since: { events: 1_000_500 }, maxSeen: null },
    })
  })

  it("ignores malformed cursors", () => {
    expect(stripeCursor({ stripe: { phase: "nope", since: { charge: "x" } } })).toEqual({
      phase: "customer",
      startingAfter: null,
      since: {},
      maxSeen: null,
    })
  })
})
