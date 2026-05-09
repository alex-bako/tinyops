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
      getUser: vi.fn(),
      syncProfile: vi.fn(),
    })

    expect(redirectTo).toBe("/login?auth=expired")
  })

  it("syncs the profile and redirects to home after successful exchange", async () => {
    const syncProfile = vi.fn().mockResolvedValue(undefined)

    const redirectTo = await handleAuthCallback(callbackUrl("?code=ok"), {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ user }),
      syncProfile,
    })

    expect(syncProfile).toHaveBeenCalledWith(user)
    expect(redirectTo).toBe("/home")
  })

  it("allows safe signed-in next paths", async () => {
    const redirectTo = await handleAuthCallback(
      callbackUrl("?code=ok&next=/home/clients"),
      {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
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
        getUser: vi.fn().mockResolvedValue({ user }),
        syncProfile: vi.fn().mockResolvedValue(undefined),
      }
    )

    expect(redirectTo).toBe("/home")
  })
})
