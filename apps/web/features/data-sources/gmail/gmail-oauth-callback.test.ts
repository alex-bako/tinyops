import { describe, expect, it, vi } from "vitest"

import {
  completeGmailOAuthCallback,
  type GmailCallbackDeps,
} from "@/features/data-sources/gmail/gmail-oauth-callback"

function deps(overrides: Partial<GmailCallbackDeps> = {}): GmailCallbackDeps {
  return {
    exchangeCode: vi
      .fn()
      .mockResolvedValue({ accessToken: "access-1", refreshToken: "refresh-1" }),
    probe: vi.fn().mockResolvedValue({
      emailAddress: "owner@gmail.com",
      labels: [{ id: "INBOX", name: "INBOX", type: "system", messagesTotal: 5 }],
    }),
    connect: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  }
}

const BASE = {
  workspaceId: "workspace_1",
  code: "auth-code",
  state: "nonce-1",
  expectedState: "nonce-1",
}

describe("completeGmailOAuthCallback", () => {
  it("exchanges, probes, and persists the connection", async () => {
    const d = deps()
    const result = await completeGmailOAuthCallback({ ...BASE, deps: d })

    expect(result).toEqual({ ok: true, emailAddress: "owner@gmail.com" })
    expect(d.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        target_workspace_id: "workspace_1",
        gmail_email: "owner@gmail.com",
        gmail_display_name: "Gmail (owner@gmail.com)",
        gmail_refresh_token: "refresh-1",
        gmail_watched_labels: ["INBOX", "SENT"],
        gmail_available_labels: [
          { path: "INBOX", name: "INBOX", messages: 5, specialUse: "system" },
        ],
      })
    )
  })

  it("rejects a mismatched CSRF state without exchanging", async () => {
    const d = deps()
    const result = await completeGmailOAuthCallback({
      ...BASE,
      state: "attacker",
      deps: d,
    })
    expect(result).toEqual({ ok: false, reason: "invalid_state" })
    expect(d.exchangeCode).not.toHaveBeenCalled()
  })

  it("fails when no authorization code is present", async () => {
    const result = await completeGmailOAuthCallback({ ...BASE, code: null, deps: deps() })
    expect(result).toEqual({ ok: false, reason: "missing_code" })
  })

  it("fails when the grant returns no refresh token", async () => {
    const d = deps({
      exchangeCode: vi.fn().mockResolvedValue({ accessToken: "a", refreshToken: null }),
    })
    const result = await completeGmailOAuthCallback({ ...BASE, deps: d })
    expect(result).toEqual({ ok: false, reason: "exchange_failed" })
  })

  it("maps an exchange exception to exchange_failed", async () => {
    const d = deps({ exchangeCode: vi.fn().mockRejectedValue(new Error("invalid_grant")) })
    const result = await completeGmailOAuthCallback({ ...BASE, deps: d })
    expect(result).toEqual({ ok: false, reason: "exchange_failed" })
  })

  it("maps a connect RPC error to connect_failed", async () => {
    const d = deps({ connect: vi.fn().mockResolvedValue({ error: { message: "boom" } }) })
    const result = await completeGmailOAuthCallback({ ...BASE, deps: d })
    expect(result).toEqual({ ok: false, reason: "connect_failed" })
  })
})
