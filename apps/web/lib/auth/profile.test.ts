import { describe, expect, it, vi } from "vitest"

import {
  acceptInviteAndUpsertProfile,
  readAppProfileSession,
} from "@/lib/auth/profile"

function profileSyncClient() {
  const upsertProfile = vi.fn().mockResolvedValue({ error: null })
  const acceptInvite = vi.fn().mockResolvedValue({ error: null })

  return {
    store: {
      upsertProfile,
      acceptInvite,
    },
    acceptInvite,
  }
}

describe("acceptInviteAndUpsertProfile", () => {
  it("accepts the invite with an injected timestamp", async () => {
    const { store, acceptInvite } = profileSyncClient()

    await acceptInviteAndUpsertProfile(
      { id: "user_123", email: "Anna@Example.CO" },
      store,
      {
        now: () => new Date("2026-05-09T06:15:00.000Z"),
      }
    )

    expect(acceptInvite).toHaveBeenCalledWith(
      "anna@example.co",
      "2026-05-09T06:15:00.000Z"
    )
  })
})

describe("readAppProfileSession", () => {
  it("uses TinyOps profile email before the Auth user email", async () => {
    const session = await readAppProfileSession({
      getUser: vi.fn().mockResolvedValue({
        user: { id: "user_123", email: "auth@example.co" },
      }),
      findProfileByUserId: vi.fn().mockResolvedValue({
        id: "user_123",
        email: "profile@example.co",
      }),
    })

    expect(session?.email).toBe("profile@example.co")
  })

  it("falls back to the normalized Auth user email when the profile is missing", async () => {
    const session = await readAppProfileSession({
      getUser: vi.fn().mockResolvedValue({
        user: { id: "user_123", email: " Recovery@Example.CO " },
      }),
      findProfileByUserId: vi.fn().mockResolvedValue(null),
    })

    expect(session?.email).toBe("recovery@example.co")
  })
})
