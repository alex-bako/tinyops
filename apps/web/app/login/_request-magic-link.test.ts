import { describe, expect, it, vi } from "vitest"

import {
  initialLoginState,
  requestMagicLinkWithDependencies,
} from "@/app/login/_request-magic-link"

function formData(email: string) {
  const data = new FormData()
  data.set("email", email)
  return data
}

describe("requestMagicLinkWithDependencies", () => {
  it("returns invalid without sending a link for invalid email", async () => {
    const isInvited = vi.fn()
    const sendMagicLink = vi.fn()

    const state = await requestMagicLinkWithDependencies(
      initialLoginState,
      formData("not-email"),
      {
        getOrigin: () => "http://localhost:3000",
        isInvited,
        sendMagicLink,
      }
    )

    expect(state.status).toBe("invalid")
    expect(isInvited).not.toHaveBeenCalled()
    expect(sendMagicLink).not.toHaveBeenCalled()
  })

  it("returns uninvited without sending a link when no invite exists", async () => {
    const isInvited = vi.fn().mockResolvedValue(false)
    const sendMagicLink = vi.fn()

    const state = await requestMagicLinkWithDependencies(
      initialLoginState,
      formData("nope@example.co"),
      {
        getOrigin: () => "http://localhost:3000",
        isInvited,
        sendMagicLink,
      }
    )

    expect(state.status).toBe("uninvited")
    expect(isInvited).toHaveBeenCalledWith("nope@example.co")
    expect(sendMagicLink).not.toHaveBeenCalled()
  })

  it("sends a magic link for invited email addresses", async () => {
    const isInvited = vi.fn().mockResolvedValue(true)
    const sendMagicLink = vi.fn().mockResolvedValue({ error: null })

    const state = await requestMagicLinkWithDependencies(
      initialLoginState,
      formData(" Anna@Example.CO "),
      {
        getOrigin: () => "http://localhost:3000",
        isInvited,
        sendMagicLink,
      }
    )

    expect(state.status).toBe("sent")
    expect(sendMagicLink).toHaveBeenCalledWith({
      email: "anna@example.co",
      emailRedirectTo: "http://localhost:3000/auth/callback",
    })
  })

  it("returns an error state when Supabase cannot send the link", async () => {
    const isInvited = vi.fn().mockResolvedValue(true)
    const sendMagicLink = vi
      .fn()
      .mockResolvedValue({ error: { message: "rate limited" } })

    const state = await requestMagicLinkWithDependencies(
      initialLoginState,
      formData("anna@example.co"),
      {
        getOrigin: () => "http://localhost:3000",
        isInvited,
        sendMagicLink,
      }
    )

    expect(state.status).toBe("error")
  })
})
