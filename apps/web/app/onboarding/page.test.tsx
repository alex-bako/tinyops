import * as React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import OnboardingPage from "@/app/onboarding/page"
import { createSupabaseWorkspaceStore } from "@/features/workspaces/supabase-store"
import { readSupabaseAppProfileSession } from "@/lib/auth/profile"
import { createServerSupabaseClient } from "@/lib/supabase/server"

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect: ${path}`)
  }),
}))

vi.mock("@/components/onboarding/onboarding-flow", () => ({
  OnboardingFlow: () =>
    React.createElement("section", { "data-testid": "onboarding-flow" }),
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

vi.mock("@/features/workspaces/supabase-store", () => ({
  createSupabaseWorkspaceStore: vi.fn(),
}))

const onboardedSession = {
  user: { id: "user_1", email: "jamie@example.co" },
  profile: {
    id: "user_1",
    email: "jamie@example.co",
    firstName: "Jamie",
    lastName: "Park",
    onboardedAt: "2026-05-10T01:02:03.000Z",
  },
  email: "jamie@example.co",
}

function mockWorkspaceStore(workspaces: unknown[]) {
  vi.mocked(createSupabaseWorkspaceStore).mockReturnValue({
    listWorkspaces: vi.fn().mockResolvedValue(workspaces),
  } as never)
}

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({} as never)
    vi.mocked(readSupabaseAppProfileSession).mockReset()
    vi.mocked(createSupabaseWorkspaceStore).mockReset()
    mockWorkspaceStore([])
  })

  it("redirects anonymous users to login", async () => {
    vi.mocked(readSupabaseAppProfileSession).mockResolvedValue(null)

    await expect(OnboardingPage()).rejects.toThrow("redirect: /login")
  })

  it("redirects to the app only when onboarded profile has a visible workspace", async () => {
    vi.mocked(readSupabaseAppProfileSession).mockResolvedValue(onboardedSession)
    mockWorkspaceStore([{ id: "workspace_1" }])

    await expect(OnboardingPage()).rejects.toThrow("redirect: /home")
  })

  it("shows onboarding when the profile is not onboarded even with a workspace", async () => {
    vi.mocked(readSupabaseAppProfileSession).mockResolvedValue({
      ...onboardedSession,
      profile: { ...onboardedSession.profile, onboardedAt: null },
    })
    mockWorkspaceStore([{ id: "workspace_1" }])

    render(await OnboardingPage())

    expect(screen.getByTestId("onboarding-flow")).toBeInTheDocument()
  })

  it("shows onboarding when onboarded profile has no visible workspace", async () => {
    vi.mocked(readSupabaseAppProfileSession).mockResolvedValue(onboardedSession)
    mockWorkspaceStore([])

    render(await OnboardingPage())

    expect(screen.getByTestId("onboarding-flow")).toBeInTheDocument()
  })
})
