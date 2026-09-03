import { describe, expect, it } from "vitest"

import { createStripeApiClient, isStripeSecretKey } from "./stripe-api"

function fetcher(responses: Array<{ status: number; body: unknown }>, urls: string[] = []) {
  return async (url: string, init?: RequestInit) => {
    urls.push(url)
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer sk_test_key")
    const next = responses.shift() ?? { status: 500, body: null }
    return { ok: next.status < 400, status: next.status, json: async () => next.body }
  }
}

describe("Stripe API client", () => {
  it("reads the account name and mode", async () => {
    const api = createStripeApiClient({
      apiKey: "sk_test_key",
      fetcher: fetcher([
        {
          status: 200,
          body: { id: "acct_1", livemode: false, settings: { dashboard: { display_name: "Shop" } } },
        },
      ]),
    })
    await expect(api.getAccount()).resolves.toEqual({ id: "acct_1", name: "Shop", livemode: false })
  })

  it("encodes list params including array expansions and created filters", async () => {
    const urls: string[] = []
    const api = createStripeApiClient({
      apiKey: "sk_test_key",
      fetcher: fetcher([{ status: 200, body: { data: [{ id: "ch_1" }], has_more: true } }], urls),
    })
    const page = await api.list("charges", {
      limit: 2,
      expand: ["data.customer"],
      "created[gte]": 10,
      starting_after: undefined,
    })
    expect(page).toEqual({ data: [{ id: "ch_1" }], hasMore: true })
    expect(urls[0]).toBe(
      "https://api.stripe.com/v1/charges?limit=2&expand%5B%5D=data.customer&created%5Bgte%5D=10"
    )
  })

  it("maps auth failures to stripe_access_failed and other failures to stripe_api_failed", async () => {
    const denied = createStripeApiClient({
      apiKey: "sk_test_key",
      fetcher: fetcher([{ status: 401, body: {} }]),
    })
    await expect(denied.getAccount()).rejects.toMatchObject({
      message: "stripe_access_failed",
      status: 401,
    })

    const broken = createStripeApiClient({
      apiKey: "sk_test_key",
      fetcher: fetcher([{ status: 502, body: null }]),
    })
    await expect(broken.list("customers", {})).rejects.toMatchObject({
      message: "stripe_api_failed",
      status: 502,
    })
  })

  it("returns null for missing or deleted customers", async () => {
    const api = createStripeApiClient({
      apiKey: "sk_test_key",
      fetcher: fetcher([
        { status: 404, body: {} },
        { status: 200, body: { id: "cus_1", deleted: true } },
        { status: 200, body: { id: "cus_2", email: "a@example.com" } },
      ]),
    })
    await expect(api.getCustomer("cus_0")).resolves.toBeNull()
    await expect(api.getCustomer("cus_1")).resolves.toBeNull()
    await expect(api.getCustomer("cus_2")).resolves.toMatchObject({ email: "a@example.com" })
  })

  it("only accepts secret keys", () => {
    expect(isStripeSecretKey(" sk_live_abc123 ")).toBe(true)
    expect(isStripeSecretKey("sk_test_abc123")).toBe(true)
    expect(isStripeSecretKey("rk_live_abc123")).toBe(false)
    expect(isStripeSecretKey("pk_live_abc123")).toBe(false)
  })
})
