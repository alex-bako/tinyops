import { describe, expect, it, vi } from "vitest"

import { createSupabaseInviteMailer } from "@/features/workspaces/invite-mailer"

function fakeAdmin(inviteError: { code?: string; message: string } | null) {
  const inviteUserByEmail = vi.fn(async () => ({ data: {}, error: inviteError }))
  const signInWithOtp = vi.fn(async () => ({ data: {}, error: null }))
  return {
    admin: { auth: { admin: { inviteUserByEmail }, signInWithOtp } },
    inviteUserByEmail,
    signInWithOtp,
  }
}

const origin = "https://app.example.co"
const redirectTo = "https://app.example.co/auth/callback?next=%2Fjoin"

describe("createSupabaseInviteMailer", () => {
  it("invites new addresses with a Join redirect", async () => {
    const fake = fakeAdmin(null)
    const mailer = createSupabaseInviteMailer({
      admin: fake.admin as never,
      origin,
    })

    await expect(mailer.sendInvite({ email: "va@example.co" })).resolves.toEqual({
      error: null,
    })
    expect(fake.inviteUserByEmail).toHaveBeenCalledWith("va@example.co", {
      redirectTo,
    })
    expect(fake.signInWithOtp).not.toHaveBeenCalled()
  })

  it("sends existing users a magic link instead of a second account", async () => {
    const fake = fakeAdmin({
      code: "email_exists",
      message: "A user with this email address has already been registered",
    })
    const mailer = createSupabaseInviteMailer({
      admin: fake.admin as never,
      origin,
    })

    await expect(mailer.sendInvite({ email: "va@example.co" })).resolves.toEqual({
      error: null,
    })
    expect(fake.signInWithOtp).toHaveBeenCalledWith({
      email: "va@example.co",
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    })
  })

  it("returns other send failures", async () => {
    const fake = fakeAdmin({ message: "smtp down" })
    const mailer = createSupabaseInviteMailer({
      admin: fake.admin as never,
      origin,
    })

    const result = await mailer.sendInvite({ email: "va@example.co" })
    expect(result.error?.message).toBe("smtp down")
    expect(fake.signInWithOtp).not.toHaveBeenCalled()
  })
})
