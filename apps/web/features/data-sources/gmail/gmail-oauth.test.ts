import { describe, expect, it } from "vitest"

import {
  buildGmailConsentUrl,
  exchangeGmailCode,
  GmailOAuthError,
  refreshGmailAccessToken,
  type FetchLike,
} from "@/features/data-sources/gmail/gmail-oauth"

const CONFIG = {
  clientId: "client-123",
  clientSecret: "secret-xyz",
  redirectUri: "https://app.tinyops.test/api/oauth/google/callback",
}

function fakeFetch(
  status: number,
  payload: unknown
): { impl: FetchLike; calls: Array<{ url: string; body: string }> } {
  const calls: Array<{ url: string; body: string }> = []
  const impl: FetchLike = async (url, init) => {
    calls.push({ url, body: init.body })
    return { ok: status >= 200 && status < 300, status, json: async () => payload }
  }
  return { impl, calls }
}

describe("buildGmailConsentUrl", () => {
  it("requests offline access with forced consent and the readonly scope", () => {
    const url = new URL(
      buildGmailConsentUrl({
        clientId: CONFIG.clientId,
        redirectUri: CONFIG.redirectUri,
        state: "nonce-1",
      })
    )
    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth"
    )
    expect(url.searchParams.get("access_type")).toBe("offline")
    expect(url.searchParams.get("prompt")).toBe("consent")
    expect(url.searchParams.get("response_type")).toBe("code")
    expect(url.searchParams.get("state")).toBe("nonce-1")
    expect(url.searchParams.get("scope")).toBe(
      "https://www.googleapis.com/auth/gmail.readonly"
    )
    expect(url.searchParams.get("client_id")).toBe("client-123")
  })
})

describe("exchangeGmailCode", () => {
  it("exchanges an authorization code for tokens", async () => {
    const { impl, calls } = fakeFetch(200, {
      access_token: "access-1",
      refresh_token: "refresh-1",
      expires_in: 3600,
    })

    const result = await exchangeGmailCode(CONFIG, "auth-code", impl)

    expect(result).toEqual({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresInSeconds: 3600,
    })
    expect(calls[0]?.url).toBe("https://oauth2.googleapis.com/token")
    expect(calls[0]?.body).toContain("grant_type=authorization_code")
    expect(calls[0]?.body).toContain("code=auth-code")
  })

  it("throws when the grant returns no refresh token", async () => {
    const { impl } = fakeFetch(200, { access_token: "access-1", expires_in: 3600 })
    await expect(exchangeGmailCode(CONFIG, "auth-code", impl)).rejects.toThrow(
      "missing_refresh_token"
    )
  })

  it("surfaces Google's error field for a failed exchange", async () => {
    const { impl } = fakeFetch(400, { error: "invalid_grant" })
    await expect(exchangeGmailCode(CONFIG, "bad-code", impl)).rejects.toBeInstanceOf(
      GmailOAuthError
    )
    await expect(exchangeGmailCode(CONFIG, "bad-code", impl)).rejects.toThrow(
      "invalid_grant"
    )
  })
})

describe("refreshGmailAccessToken", () => {
  it("mints an access token from a refresh token", async () => {
    const { impl, calls } = fakeFetch(200, { access_token: "access-2", expires_in: 3599 })

    const result = await refreshGmailAccessToken(
      { clientId: CONFIG.clientId, clientSecret: CONFIG.clientSecret, refreshToken: "refresh-1" },
      impl
    )

    expect(result.accessToken).toBe("access-2")
    expect(result.refreshToken).toBeNull()
    expect(calls[0]?.body).toContain("grant_type=refresh_token")
    expect(calls[0]?.body).toContain("refresh_token=refresh-1")
  })

  it("throws GmailOAuthError carrying invalid_grant on revoked tokens", async () => {
    const { impl } = fakeFetch(400, { error: "invalid_grant" })
    await expect(
      refreshGmailAccessToken(
        { clientId: CONFIG.clientId, clientSecret: CONFIG.clientSecret, refreshToken: "dead" },
        impl
      )
    ).rejects.toThrow("invalid_grant")
  })
})
