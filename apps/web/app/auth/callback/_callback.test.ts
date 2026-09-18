import { describe, expect, it, vi } from "vitest"

import { handleAuthCallback } from "@/app/auth/callback/_callback"

const user = { id: "user_123", email: "anna@example.co" }

function callbackUrl(search: string) {
  return new URL(`http://localhost:3000/auth/callback${search}`)
}

describe("handleAuthCallback", () => {
  it("redirects to login when the code is missing", async () => {
    const redirectTo = await handleAuthCallback(callbackUrl(""), {
      exchangeCodeForSession: vi.fn(),
      verifyOtp: vi.fn(),
      getUser: vi.fn(),
      syncProfile: vi.fn(),
    })

    expect(redirectTo).toBe("/login?auth=expired")
  })

  it("redirects to login when code exchange fails", async () => {
    const redirectTo = await handleAuthCallback(callbackUrl("?code=bad"), {
      exchangeCodeForSession: vi
        .fn()
        .mockResolvedValue({ error: { message: "expired" } }),
      verifyOtp: vi.fn(),
      getUser: vi.fn(),
      syncProfile: vi.fn(),
    })

    expect(redirectTo).toBe("/login?auth=expired")
  })

  it("syncs the profile and redirects to home after successful exchange", async () => {
    const syncProfile = vi.fn().mockResolvedValue(undefined)

    const redirectTo = await handleAuthCallback(callbackUrl("?code=ok"), {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn(),
      getUser: vi.fn().mockResolvedValue({ user }),
      syncProfile,
    })

    expect(syncProfile).toHaveBeenCalledWith(user)
    expect(redirectTo).toBe("/home")
  })

  it("verifies token-hash links from invites and generated magic links", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null })
    const syncProfile = vi.fn().mockResolvedValue(undefined)

    const redirectTo = await handleAuthCallback(
      callbackUrl("?next=%2Fjoin&token_hash=abc&type=invite"),
      {
        exchangeCodeForSession: vi.fn(),
        verifyOtp,
        getUser: vi.fn().mockResolvedValue({ user }),
        syncProfile,
      }
    )

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "invite" })
    expect(syncProfile).toHaveBeenCalledWith(user)
    expect(redirectTo).toBe("/join")
  })

  it("rejects token-hash links of unexpected types or failed verification", async () => {
    const deps = {
      exchangeCodeForSession: vi.fn(),
      verifyOtp: vi.fn().mockResolvedValue({ error: { message: "expired" } }),
      getUser: vi.fn(),
      syncProfile: vi.fn(),
    }

    await expect(
      handleAuthCallback(callbackUrl("?token_hash=abc&type=recovery"), deps)
    ).resolves.toBe("/login?auth=expired")
    expect(deps.verifyOtp).not.toHaveBeenCalled()

    await expect(
      handleAuthCallback(callbackUrl("?token_hash=abc&type=magiclink"), deps)
    ).resolves.toBe("/login?auth=expired")
    expect(deps.getUser).not.toHaveBeenCalled()
  })

  it("allows safe signed-in next paths", async () => {
    const redirectTo = await handleAuthCallback(
      callbackUrl("?code=ok&next=/home/clients"),
      {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        verifyOtp: vi.fn(),
        getUser: vi.fn().mockResolvedValue({ user }),
        syncProfile: vi.fn().mockResolvedValue(undefined),
      }
    )

    expect(redirectTo).toBe("/home/clients")
  })

  it("rejects unsafe next paths", async () => {
    const redirectTo = await handleAuthCallback(
      callbackUrl("?code=ok&next=https://example.com"),
      {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        verifyOtp: vi.fn(),
        getUser: vi.fn().mockResolvedValue({ user }),
        syncProfile: vi.fn().mockResolvedValue(undefined),
      }
    )

    expect(redirectTo).toBe("/home")
  })
})
