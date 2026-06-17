import { describe, expect, it, vi } from "vitest"

import { createSupabaseGmailCredentialReader } from "@/features/data-sources/gmail/gmail-secret-reader"
import { GmailOAuthError } from "@/features/data-sources/gmail/gmail-oauth"

const INPUT = { workspaceId: "workspace_1", sourceId: "source_1" }

describe("Gmail credential reader", () => {
  it("reads the refresh token and exchanges it for an access token", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: "refresh-token-1", error: null }),
    }
    const refreshAccessToken = vi.fn().mockResolvedValue({
      accessToken: "access-1",
      refreshToken: null,
      expiresInSeconds: 3600,
    })

    const reader = createSupabaseGmailCredentialReader({
      client: client as never,
      refreshAccessToken,
    })

    await expect(reader.readAccessTokenForSync(INPUT)).resolves.toEqual({
      ok: true,
      value: "access-1",
    })
    expect(client.rpc).toHaveBeenCalledWith(
      "read_gmail_data_source_refresh_token",
      { target_workspace_id: "workspace_1", target_source_id: "source_1" }
    )
    expect(refreshAccessToken).toHaveBeenCalledWith("refresh-token-1")
  })

  it("maps RPC domain errors to typed sync failures", async () => {
    const client = {
      rpc: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: "source_not_found" } }),
    }
    const reader = createSupabaseGmailCredentialReader({
      client: client as never,
      refreshAccessToken: vi.fn(),
    })

    await expect(reader.readAccessTokenForSync(INPUT)).resolves.toEqual({
      ok: false,
      error: {
        code: "source_not_found",
        message: "Source not found",
        workspaceId: "workspace_1",
        sourceId: "source_1",
        cause: { message: "source_not_found" },
      },
    })
  })

  it("classifies a revoked grant as gmail_auth_revoked", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: "dead-token", error: null }),
    }
    const reader = createSupabaseGmailCredentialReader({
      client: client as never,
      refreshAccessToken: vi.fn().mockRejectedValue(new GmailOAuthError("invalid_grant")),
    })

    const result = await reader.readAccessTokenForSync(INPUT)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe("gmail_auth_revoked")
  })

  it("classifies a transient exchange failure as gmail_api_error", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: "live-token", error: null }),
    }
    const reader = createSupabaseGmailCredentialReader({
      client: client as never,
      refreshAccessToken: vi.fn().mockRejectedValue(new Error("ECONNRESET")),
    })

    const result = await reader.readAccessTokenForSync(INPUT)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe("gmail_api_error")
  })

  it("writes back a rotated refresh token best-effort", async () => {
    const client = {
      rpc: vi
        .fn()
        .mockResolvedValueOnce({ data: "old-refresh", error: null })
        .mockResolvedValueOnce({ data: null, error: null }),
    }
    const reader = createSupabaseGmailCredentialReader({
      client: client as never,
      refreshAccessToken: vi.fn().mockResolvedValue({
        accessToken: "access-9",
        refreshToken: "new-refresh",
        expiresInSeconds: 3600,
      }),
    })

    await expect(reader.readAccessTokenForSync(INPUT)).resolves.toEqual({
      ok: true,
      value: "access-9",
    })
    expect(client.rpc).toHaveBeenNthCalledWith(
      2,
      "rotate_gmail_data_source_refresh_token",
      {
        target_workspace_id: "workspace_1",
        target_source_id: "source_1",
        new_refresh_token: "new-refresh",
      }
    )
  })
})
