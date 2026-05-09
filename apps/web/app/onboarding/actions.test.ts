import { beforeEach, describe, expect, it, vi } from "vitest"

import { completeOnboarding } from "@/app/onboarding/actions"
import { createOnboardingApplication } from "@/features/onboarding/application"
import type { OnboardingCommand } from "@/features/onboarding/application"
import { createSupabaseOnboardingStore } from "@/features/onboarding/supabase-store"
import { createSupabaseDataSourceStore } from "@/features/data-sources/supabase-store"
import { createImapFlowConnectionTester } from "@/features/data-sources/imap-connection-tester"
import { readSupabaseAppProfileSession } from "@/lib/auth/profile"
import { createServerSupabaseClient } from "@/lib/supabase/server"

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => {
    throw new Error("onboarding completion must not use cookies")
  }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock("@/lib/auth/profile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/profile")>(
    "@/lib/auth/profile"
  )
  return {
    ...actual,
    readSupabaseAppProfileSession: vi.fn(),
  }
})

vi.mock("@/features/onboarding/supabase-store", () => ({
  createSupabaseOnboardingStore: vi.fn(),
}))

vi.mock("@/features/data-sources/supabase-store", () => ({
  createSupabaseDataSourceStore: vi.fn(),
}))

vi.mock("@/features/data-sources/imap-connection-tester", () => ({
  createImapFlowConnectionTester: vi.fn(),
}))

vi.mock("@/features/onboarding/application", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/onboarding/application")
  >("@/features/onboarding/application")
  return {
    ...actual,
    createOnboardingApplication: vi.fn(),
  }
})

const command = {
  firstName: "Jamie",
  lastName: "Park",
  senderName: "Jamie",
  workspaceName: "Park Therapy",
  workspaceHandle: "park-therapy",
  vertical: "therapy",
  sensitivity: "strict",
  source: { type: "skip" },
  invites: [],
} satisfies OnboardingCommand

describe("completeOnboarding", () => {
  beforeEach(() => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({} as never)
    vi.mocked(readSupabaseAppProfileSession).mockReset()
    vi.mocked(createSupabaseOnboardingStore).mockReturnValue({} as never)
    vi.mocked(createSupabaseDataSourceStore).mockReturnValue({} as never)
    vi.mocked(createImapFlowConnectionTester).mockReturnValue({} as never)
    vi.mocked(createOnboardingApplication).mockReset()
  })

  it("returns not_authenticated when there is no app profile session", async () => {
    vi.mocked(readSupabaseAppProfileSession).mockResolvedValue(null)

    await expect(completeOnboarding(command)).resolves.toEqual({
      status: "validation_error",
      error: "not_authenticated",
    })
    expect(createOnboardingApplication).not.toHaveBeenCalled()
  })

  it("passes the full command to the onboarding application", async () => {
    const complete = vi.fn().mockResolvedValue({
      status: "completed",
      workspaceId: "workspace_1",
    })
    vi.mocked(readSupabaseAppProfileSession).mockResolvedValue({
      user: { id: "user_1", email: "auth@example.co" },
      profile: {
        id: "user_1",
        email: "profile@example.co",
        firstName: null,
        lastName: null,
        onboardedAt: null,
      },
      email: "profile@example.co",
    })
    vi.mocked(createOnboardingApplication).mockReturnValue({
      complete,
    } as never)

    await expect(completeOnboarding(command)).resolves.toEqual({
      status: "completed",
      workspaceId: "workspace_1",
    })

    expect(createOnboardingApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { userId: "user_1", email: "profile@example.co" },
      })
    )
    expect(complete).toHaveBeenCalledWith(command)
  })
})
