import { describe, expect, it } from "vitest"

import { isValidNormalizedRecord } from "@/features/clients/domain/connector-record"
import {
  buildStripeRecord,
  buildStripeSourceConfig,
  formatMoney,
  stripeObjectCustomerId,
  stripeObjectEmail,
  stripeObjectFromEvent,
  type StripeObject,
} from "./stripe"

const context = {
  workspaceId: "workspace_1",
  sourceId: "source_1",
  source: { accountId: "acct_1" },
}

describe("Stripe records", () => {
  it("turns a charge into a payment event linked by the billing email", () => {
    const item: StripeObject = {
      kind: "charge",
      object: {
        id: "ch_1",
        amount: 4900,
        currency: "eur",
        status: "succeeded",
        created: 1_760_000_000,
        description: "Coaching session",
        billing_details: { email: "Client@Example.com", name: "Client One" },
        customer: { id: "cus_1", email: "other@example.com" },
      },
    }
    const email = stripeObjectEmail(item)
    expect(email).toBe("client@example.com")

    const record = buildStripeRecord({ ...context, item, email: email! })
    expect(isValidNormalizedRecord(record)).toBe(true)
    expect(record).toMatchObject({
      sourceType: "stripe",
      externalId: "stripe:charge:ch_1",
      recordType: "stripe_charge",
      eventType: "payment",
      occurredAt: "2025-10-09T08:53:20.000Z",
      participants: [{ email: "client@example.com", name: "Client One", role: "external" }],
      identities: [{ type: "external_id", value: "cus_1" }],
      metadata: { title: "Payment €49.00", status: "succeeded", amount: 4900 },
    })
    expect(record.body.text).toContain("Description: Coaching session")
  })

  it("stores customers as identities and attributes without a timeline event", () => {
    const item: StripeObject = {
      kind: "customer",
      object: { id: "cus_1", email: "client@example.com", name: "Client", created: 1_700_000_000 },
    }
    const record = buildStripeRecord({ ...context, item, email: "client@example.com" })
    expect(isValidNormalizedRecord(record)).toBe(true)
    expect(record.eventType).toBeNull()
    expect(record.identities).toEqual([{ type: "external_id", value: "cus_1" }])
    expect(record.attributes.map((attribute) => attribute.key)).toEqual([
      "stripe_customer_id",
      "stripe_customer_since",
    ])
  })

  it("resolves refunds and disputes through the expanded charge", () => {
    const refund: StripeObject = {
      kind: "refund",
      object: {
        id: "re_1",
        amount: 1000,
        currency: "usd",
        status: "succeeded",
        created: 1_760_000_000,
        charge: {
          id: "ch_1",
          amount: 1000,
          currency: "usd",
          status: "succeeded",
          created: 1_759_000_000,
          receipt_email: "client@example.com",
          customer: "cus_9",
        },
      },
    }
    expect(stripeObjectEmail(refund)).toBe("client@example.com")
    expect(stripeObjectCustomerId(refund)).toBe("cus_9")
    expect(buildStripeRecord({ ...context, item: refund, email: "client@example.com" }).metadata).toMatchObject({
      title: "Refund $10.00",
    })
  })

  it("falls back to the customer id when no email is inline", () => {
    const subscription: StripeObject = {
      kind: "subscription",
      object: { id: "sub_1", status: "active", created: 1_760_000_000, customer: "cus_2" },
    }
    expect(stripeObjectEmail(subscription)).toBeNull()
    expect(stripeObjectCustomerId(subscription)).toBe("cus_2")
  })

  it("extracts the touched object from an event and ignores unknown kinds", () => {
    expect(
      stripeObjectFromEvent({
        id: "evt_1",
        type: "customer.subscription.deleted",
        created: 1,
        data: { object: { id: "sub_1", object: "subscription", status: "canceled", created: 1 } },
      })
    ).toMatchObject({ kind: "subscription", object: { id: "sub_1" } })
    expect(
      stripeObjectFromEvent({
        id: "evt_2",
        type: "payout.paid",
        created: 1,
        data: { object: { id: "po_1", object: "payout" } },
      })
    ).toBeNull()
  })

  it("formats zero-decimal currencies without dividing", () => {
    expect(formatMoney(1500, "jpy")).toBe("¥1,500")
    expect(formatMoney(1500, "usd")).toBe("$15.00")
  })

  it("normalizes the source config and rejects bad input", () => {
    expect(
      buildStripeSourceConfig({ displayName: " Shop ", accountId: "acct_1", syncFrom: "2026-01-01" })
    ).toEqual({ displayName: "Shop", accountId: "acct_1", syncFrom: "2026-01-01T00:00:00.000Z" })
    expect(() =>
      buildStripeSourceConfig({ displayName: "Shop", accountId: "acct_1", syncFrom: "soon" })
    ).toThrow("invalid_stripe_config")
    expect(() =>
      buildStripeSourceConfig({ displayName: " ", accountId: "acct_1", syncFrom: "2026-01-01" })
    ).toThrow("invalid_data_source_name")
  })
})
