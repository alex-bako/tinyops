import { describe, expect, it } from "vitest"

import { createMailerLiteApiClient, isMailerLiteApiKey } from "./mailerlite-api"

function fetcher(responses: Array<{ status: number; body: unknown }>, urls: string[] = []) {
  return async (url: string, init?: RequestInit) => {
    urls.push(url)
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer ml_test_key")
    const next = responses.shift() ?? { status: 500, body: null }
    return { ok: next.status < 400, status: next.status, json: async () => next.body }
  }
}

describe("MailerLite API client", () => {
  it("encodes filter params and reads cursor pagination", async () => {
    const urls: string[] = []
    const api = createMailerLiteApiClient({
      apiKey: "ml_test_key",
      fetcher: fetcher(
        [{ status: 200, body: { data: [{ id: "1" }], meta: { next_cursor: "abc", prev_cursor: null } } }],
        urls
      ),
    })
    const page = await api.list("subscribers", { limit: 2, include: "groups", cursor: undefined })
    expect(page).toEqual({ data: [{ id: "1" }], nextCursor: "abc", hasMore: true })
    expect(urls[0]).toBe(
      "https://connect.mailerlite.com/api/subscribers?limit=2&include=groups"
    )
  })

  it("reads page pagination from meta and links", async () => {
    const api = createMailerLiteApiClient({
      apiKey: "ml_test_key",
      fetcher: fetcher([
        { status: 200, body: { data: [], meta: { current_page: 1, last_page: 3 } } },
        { status: 200, body: { data: [], links: { next: null }, meta: { current_page: 3, last_page: 3 } } },
        { status: 200, body: { data: [], links: { next: "https://x/?page=2" } } },
      ]),
    })
    expect((await api.list("campaigns", { "filter[status]": "sent" })).hasMore).toBe(true)
    expect((await api.list("campaigns", { page: 3 })).hasMore).toBe(false)
    expect((await api.list("campaigns", {})).hasMore).toBe(true)
  })

  it("maps auth failures to mailerlite_access_failed and other failures to mailerlite_api_failed", async () => {
    const denied = createMailerLiteApiClient({
      apiKey: "ml_test_key",
      fetcher: fetcher([{ status: 401, body: {} }]),
    })
    await expect(denied.list("subscribers")).rejects.toMatchObject({
      message: "mailerlite_access_failed",
      status: 401,
    })

    const throttled = createMailerLiteApiClient({
      apiKey: "ml_test_key",
      fetcher: fetcher([{ status: 429, body: null }]),
    })
    await expect(throttled.list("subscribers")).rejects.toMatchObject({
      message: "mailerlite_api_failed",
      status: 429,
    })
  })

  it("rejects short or spaced keys", () => {
    expect(isMailerLiteApiKey(" eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.abc ")).toBe(true)
    expect(isMailerLiteApiKey("short")).toBe(false)
    expect(isMailerLiteApiKey("eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9 abc")).toBe(false)
  })
})
