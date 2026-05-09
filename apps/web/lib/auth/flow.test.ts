import { describe, expect, it, vi } from "vitest"

import {
  completeAuthCallback,
  requestMagicLink,
} from "@/lib/auth/flow"

const user = { id: "user_123", email: "anna@example.co" }

function callbackUrl(search: string) {
  return new URL(`http://localhost:3000/auth/callback${search}`)
}

describe("requestMagicLink", () => {
  it("returns invalid for malformed email", async () => {
    const isInvited = vi.fn()
    const sendMagicLink = vi.fn()

    const outcome = await requestMagicLink(
      { email: "not-email" },
      {
        getOrigin: () => "http://localhost:3000",
        isInvited,
        sendMagicLink,
      }
    )

    expect(outcome).toEqual({ status: "invalid" })
    expect(isInvited).not.toHaveBeenCalled()
    expect(sendMagicLink).not.toHaveBeenCalled()
  })

  it("returns uninvited for normalized email without an invite", async () => {
    const outcome = await requestMagicLink(
      { email: " Anna@Example.CO " },
      {
        getOrigin: () => "http://localhost:3000",
        isInvited: vi.fn().mockResolvedValue(false),
        sendMagicLink: vi.fn(),
      }
    )

    expect(outcome).toEqual({
      status: "uninvited",
      email: "anna@example.co",
    })
  })

  it("returns sent for invited email after sending a callback link", async () => {
    const sendMagicLink = vi.fn().mockResolvedValue({ error: null })

    const outcome = await requestMagicLink(
      { email: "anna@example.co" },
      {
        getOrigin: () => "http://localhost:3000",
        isInvited: vi.fn().mockResolvedValue(true),
        sendMagicLink,
      }
    )

    expect(outcome).toEqual({ status: "sent", email: "anna@example.co" })
    expect(sendMagicLink).toHaveBeenCalledWith({
      email: "anna@example.co",
      emailRedirectTo: "http://localhost:3000/auth/callback",
    })
  })

  it("returns error when the magic link cannot be sent", async () => {
    const outcome = await requestMagicLink(
      { email: "anna@example.co" },
      {
        getOrigin: () => "http://localhost:3000",
        isInvited: vi.fn().mockResolvedValue(true),
        sendMagicLink: vi
          .fn()
          .mockResolvedValue({ error: { message: "rate limited" } }),
      }
    )

    expect(outcome).toEqual({ status: "error", email: "anna@example.co" })
  })
})

describe("completeAuthCallback", () => {
  it("returns expired login redirect when the callback code is missing", async () => {
    const redirectTo = await completeAuthCallback(callbackUrl(""), {
      exchangeCodeForSession: vi.fn(),
      getUser: vi.fn(),
      syncProfile: vi.fn(),
    })

    expect(redirectTo).toBe("/login?auth=expired")
  })

  it("returns expired login redirect when the code cannot be exchanged", async () => {
    const redirectTo = await completeAuthCallback(callbackUrl("?code=bad"), {
      exchangeCodeForSession: vi
        .fn()
        .mockResolvedValue({ error: { message: "expired" } }),
      getUser: vi.fn(),
      syncProfile: vi.fn(),
    })

    expect(redirectTo).toBe("/login?auth=expired")
  })

  it("syncs the profile and returns the safe signed-in path", async () => {
    const syncProfile = vi.fn().mockResolvedValue(undefined)

    const redirectTo = await completeAuthCallback(
      callbackUrl("?code=ok&next=/home/clients"),
      {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({ user }),
        syncProfile,
      }
    )

    expect(syncProfile).toHaveBeenCalledWith(user)
    expect(redirectTo).toBe("/home/clients")
  })
})
