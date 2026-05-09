import { describe, expect, it, vi } from "vitest"

import { isInvitedEmail, type InviteLookupClient } from "@/lib/auth/invites"

function inviteClient(result: {
  data: { email: string } | null
  error: { message: string } | null
}): InviteLookupClient {
  const maybeSingle = vi.fn().mockResolvedValue(result)
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })

  return { from }
}

describe("isInvitedEmail", () => {
  it("returns true when an invite row exists", async () => {
    await expect(
      isInvitedEmail(
        "anna@example.co",
        inviteClient({ data: { email: "anna@example.co" }, error: null })
      )
    ).resolves.toBe(true)
  })

  it("returns false when no invite row exists", async () => {
    await expect(
      isInvitedEmail(
        "nope@example.co",
        inviteClient({ data: null, error: null })
      )
    ).resolves.toBe(false)
  })

  it("throws when the invite lookup fails", async () => {
    await expect(
      isInvitedEmail(
        "anna@example.co",
        inviteClient({ data: null, error: { message: "database unavailable" } })
      )
    ).rejects.toThrow("Could not check invite")
  })
})
