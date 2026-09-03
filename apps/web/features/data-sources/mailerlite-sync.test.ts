import { describe, expect, it } from "vitest"

import { createMailerLiteConnector, mailerLiteCursor, type MailerLiteCursor } from "./mailerlite-sync"
import type { MailerLiteApiPort, MailerLiteDataSource } from "./types"

const NOW = Date.parse("2026-09-03T12:00:00.000Z")
const DAY = 24 * 60 * 60 * 1000

function source(
  cursor: Partial<MailerLiteCursor> | null = null,
  shops: MailerLiteDataSource["shops"] = [{ id: "shop_1", name: "Shop", currency: "USD" }]
): MailerLiteDataSource {
  return {
    id: "source_1",
    workspaceId: "workspace_1",
    type: "mailerlite",
    sourceSlug: "newsletter",
    displayName: "Newsletter",
    status: "connected",
    configVersion: 1,
    accountId: "shop_1",
    syncFrom: "2026-01-01T00:00:00.000Z",
    shops,
    secret: { purpose: "mailerlite_api_key", maskedValue: "****abcd" },
    sync: {
      status: "running",
      cursor: cursor ? { mailerlite: cursor } : null,
      lastError: null,
      lastSyncedAt: null,
    },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  }
}

type Page = { data: unknown[]; nextCursor?: string | null; hasMore?: boolean }

function api(pages: Record<string, Page[]>, calls: unknown[] = []): MailerLiteApiPort {
  return {
    async list(path, params) {
      calls.push({ path, params })
      const page = pages[path]?.shift() ?? { data: [] }
      return { data: page.data, nextCursor: page.nextCursor ?? null, hasMore: page.hasMore ?? false }
    },
  }
}

const input = { workspaceId: "workspace_1", sourceId: "source_1", limit: 50 }

function connector(
  cursor: Partial<MailerLiteCursor> | null,
  pages: Record<string, Page[]>,
  calls: unknown[] = [],
  shops?: MailerLiteDataSource["shops"]
) {
  return createMailerLiteConnector({ source: source(cursor, shops), api: api(pages, calls), now: () => NOW })
}

describe("MailerLite connector", () => {
  it("walks subscribers by cursor into identities and attributes", async () => {
    const calls: unknown[] = []
    const result = await connector(
      null,
      {
        subscribers: [
          {
            data: [
              {
                id: "sub_1",
                email: "Ann@Example.com",
                status: "active",
                subscribed_at: "2026-02-01 10:00:00",
                fields: { name: "Ann", last_name: "Lee", company: "Acme", city: null, plan_tier: "" },
                groups: [{ id: "g1", name: "Paid · annual" }],
              },
              { id: "sub_2", email: "not-an-email" },
            ],
            nextCursor: "next",
          },
        ],
      },
      calls
    ).sync(input)

    expect(calls).toEqual([
      { path: "subscribers", params: { limit: 50, cursor: undefined, include: "groups" } },
    ])
    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({
      externalId: "mailerlite:subscriber:sub_1",
      recordType: "mailerlite_subscriber",
      eventType: null,
      occurredAt: "2026-02-01T10:00:00.000Z",
      participants: [{ email: "ann@example.com", name: "Ann Lee", role: "external" }],
      identities: [{ type: "external_id", value: "sub_1" }],
    })
    expect(result.records[0]?.attributes).toEqual([
      { key: "mailerlite_subscriber_id", value: "sub_1", confidence: 1 },
      { key: "mailerlite_status", value: "active", confidence: 1 },
      { key: "mailerlite_groups", value: ["Paid · annual"], confidence: 1 },
      { key: "mailerlite_subscribed_at", value: "2026-02-01T10:00:00.000Z", confidence: 1 },
      { key: "mailerlite_field_company", value: "Acme", confidence: 1 },
    ])
    expect(result.diagnostics).toMatchObject({ phase: "subscriber", skippedWithoutEmail: 1 })
    expect(result.truncated).toBe(true)
    expect(result.cursor).toMatchObject({ mailerlite: { phase: "subscriber", cursor: "next" } })
  })

  it("moves to orders after the last subscriber page, or straight to campaigns without shops", async () => {
    const withShops = await connector(null, { subscribers: [{ data: [] }] }).sync(input)
    expect(withShops.cursor).toMatchObject({ mailerlite: { phase: "order", shopIndex: 0, page: 1 } })

    const noShops = await connector(null, { subscribers: [{ data: [] }] }, [], []).sync(input)
    expect(noShops.cursor).toMatchObject({
      mailerlite: { phase: "campaign", page: 1, campaignPassStartedAt: new Date(NOW).toISOString() },
    })
  })

  it("turns shop orders into payment events and skips orders before the sync start", async () => {
    const calls: unknown[] = []
    const order = (id: string, created_at: string) => ({
      id,
      status: "complete",
      total: "20",
      created_at,
      shop: { id: "shop_1", name: "Shop", currency: "USD" },
      customer: { email: "buyer@example.com", subscriber: { id: "sub_9", email: "buyer@example.com", fields: { name: "Bo" } } },
      cart: { items: [{ quantity: 2, product: { name: "T-Shirt" }, variant: "M" }] },
    })
    const result = await connector(
      { phase: "order", shopIndex: 0, page: 2 },
      { "ecommerce/shops/shop_1/orders": [{ data: [order("o_new", "2026-03-01 09:00:00"), order("o_old", "2025-12-31 09:00:00")], hasMore: false }] },
      calls
    ).sync(input)

    expect(calls[0]).toEqual({ path: "ecommerce/shops/shop_1/orders", params: { limit: 50, page: 2 } })
    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({
      externalId: "mailerlite:order:o_new",
      eventType: "payment",
      occurredAt: "2026-03-01T09:00:00.000Z",
      participants: [{ email: "buyer@example.com", name: "Bo", role: "external" }],
      identities: [{ type: "external_id", value: "sub_9" }],
      metadata: { title: "Order complete $20.00", status: "complete", amount: 20, currency: "USD" },
    })
    expect(result.records[0]?.body.text).toContain("2× T-Shirt (M)")
    expect(result.cursor).toMatchObject({ mailerlite: { phase: "campaign", campaignIndex: 0, activity: "opened" } })
  })

  it("reads opened then clicked reports per campaign and freezes old campaigns after a pass", async () => {
    const calls: unknown[] = []
    const recent = new Date(NOW - 5 * DAY).toISOString()
    const old = new Date(NOW - 60 * DAY).toISOString()
    const campaigns = [
      { id: "c_old", name: "Old", finished_at: old, emails: [{ subject: "Old news" }] },
      { id: "c_new", name: "New", finished_at: recent, emails: [{ subject: "Fresh" }] },
      { id: "c_early", name: "Early", finished_at: "2025-06-01T00:00:00.000Z" },
    ]
    const passStart = new Date(NOW - DAY).toISOString()
    const base = { phase: "campaign" as const, page: 1, campaignPassStartedAt: passStart, lastCampaignPass: passStart }

    const frozen = await connector({ ...base, campaignIndex: 0 }, { campaigns: [{ data: campaigns }] }, calls).sync(input)
    expect(calls).toHaveLength(1)
    expect(frozen.records).toEqual([])
    expect(frozen.cursor).toMatchObject({ mailerlite: { campaignIndex: 1, activity: "opened", activityPage: 1 } })

    calls.length = 0
    const opened = await connector(
      { ...base, campaignIndex: 1 },
      {
        campaigns: [{ data: campaigns }],
        "campaigns/c_new/reports/subscriber-activity": [
          { data: [{ opens_count: 2, clicks_count: 0, subscriber: { id: "sub_1", email: "a@example.com" } }], hasMore: false },
        ],
      },
      calls
    ).sync(input)
    expect(calls[1]).toEqual({
      path: "campaigns/c_new/reports/subscriber-activity",
      params: { "filter[type]": "opened", limit: 50, page: 1 },
    })
    expect(opened.records[0]).toMatchObject({
      externalId: "mailerlite:engagement:c_new:sub_1",
      eventType: "email_engagement",
      occurredAt: recent,
      metadata: { title: "Opened · Fresh", opens: 2, clicks: 0 },
    })
    expect(opened.cursor).toMatchObject({ mailerlite: { campaignIndex: 1, activity: "clicked", activityPage: 1 } })

    const clicked = await connector(
      { ...base, campaignIndex: 1, activity: "clicked" },
      {
        campaigns: [{ data: campaigns }],
        "campaigns/c_new/reports/subscriber-activity": [
          { data: [{ opens_count: 2, clicks_count: 1, subscriber: { id: "sub_1", email: "a@example.com" } }], hasMore: false },
        ],
      }
    ).sync(input)
    expect(clicked.records[0]).toMatchObject({ metadata: { title: "Clicked · Fresh", clicks: 1 } })
    expect(clicked.cursor).toMatchObject({ mailerlite: { campaignIndex: 2 } })

    const early = await connector({ ...base, campaignIndex: 2 }, { campaigns: [{ data: campaigns }] }).sync(input)
    expect(early.records).toEqual([])
    expect(early.cursor).toMatchObject({ mailerlite: { campaignIndex: 3 } })

    const done = await connector({ ...base, campaignIndex: 3 }, { campaigns: [{ data: campaigns, hasMore: false }] }).sync(input)
    expect(done.truncated).toBe(false)
    expect(done.cursor).toEqual({
      mailerlite: {
        phase: "subscriber",
        cursor: null,
        shopIndex: 0,
        page: 1,
        campaignIndex: 0,
        activity: "opened",
        activityPage: 1,
        campaignPassStartedAt: null,
        lastCampaignPass: passStart,
      },
    })
  })

  it("scans every campaign on the first pass and rounds the report limit down", async () => {
    const calls: unknown[] = []
    const old = new Date(NOW - 100 * DAY).toISOString()
    await createMailerLiteConnector({
      source: source({ phase: "campaign", campaignPassStartedAt: new Date(NOW).toISOString() }),
      api: api({ campaigns: [{ data: [{ id: "c1", finished_at: old }] }] }, calls),
      now: () => NOW,
    }).sync({ ...input, limit: 60 })
    expect(calls[1]).toMatchObject({ params: { limit: 50 } })
  })

  it("ignores malformed cursors", () => {
    expect(mailerLiteCursor({ mailerlite: { phase: "nope", page: -1, activity: "x", lastCampaignPass: "bad" } })).toEqual({
      phase: "subscriber",
      cursor: null,
      shopIndex: 0,
      page: 1,
      campaignIndex: 0,
      activity: "opened",
      activityPage: 1,
      campaignPassStartedAt: null,
      lastCampaignPass: null,
    })
  })
})
