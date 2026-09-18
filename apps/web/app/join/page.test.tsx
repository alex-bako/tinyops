import * as React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import JoinPage from "@/app/join/page"
import { createSupabaseWorkspaceStore } from "@/features/workspaces/supabase-store"
import { readSupabaseAppProfileSession } from "@/lib/auth/profile"
import { createServerSupabaseClient } from "@/lib/supabase/server"

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect: ${path}`)
  }),
}))

vi.mock("@/components/join/join-flow", () => ({
  JoinFlow: (props: { invitations: unknown[]; firstName: string }) =>
    React.createElement("section", {
      "data-testid": "join-flow",
      "data-count": props.invitations.length,
      "data-first-name": props.firstName,
    }),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock("@/lib/auth/profile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/profile")>(
    "@/lib/auth/profile"
  )
  return { ...actual, readSupabaseAppProfileSession: vi.fn() }
})

vi.mock("@/features/workspaces/supabase-store", () => ({
  createSupabaseWorkspaceStore: vi.fn(),
}))

const session = {
  user: { id: "user_1", email: "mia@example.co" },
  profile: {
    id: "user_1",
    email: "mia@example.co",
    firstName: "Mia",
    lastName: null,
    onboardedAt: null,
  },
  email: "mia@example.co",
}

function mockStore(workspaces: unknown[], invitations: unknown[]) {
  vi.mocked(createSupabaseWorkspaceStore).mockReturnValue({
    listWorkspaces: vi.fn().mockResolvedValue(workspaces),
    listJoinableWorkspaces: vi.fn().mockResolvedValue(invitations),
  } as never)
}

describe("JoinPage", () => {
  beforeEach(() => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({} as never)
    vi.mocked(readSupabaseAppProfileSession).mockReset()
    vi.mocked(createSupabaseWorkspaceStore).mockReset()
  })

  it("redirects anonymous users to login", async () => {
    vi.mocked(readSupabaseAppProfileSession).mockResolvedValue(null)
    await expect(JoinPage()).rejects.toThrow("redirect: /login")
  })

  it("sends members to the app (switcher handles their invitations)", async () => {
    vi.mocked(readSupabaseAppProfileSession).mockResolvedValue(session)
    mockStore([{ id: "workspace_1" }], [{ invitationId: "invite_1" }])
    await expect(JoinPage()).rejects.toThrow("redirect: /home")
  })

  it("sends users without an invitation to onboarding", async () => {
    vi.mocked(readSupabaseAppProfileSession).mockResolvedValue(session)
    mockStore([], [])
    await expect(JoinPage()).rejects.toThrow("redirect: /onboarding")
  })

  it("renders the join flow with every pending invitation and the known name", async () => {
    vi.mocked(readSupabaseAppProfileSession).mockResolvedValue(session)
    mockStore([], [{ invitationId: "invite_1" }, { invitationId: "invite_2" }])

    render(await JoinPage())

    expect(screen.getByTestId("join-flow")).toHaveAttribute("data-count", "2")
    expect(screen.getByTestId("join-flow")).toHaveAttribute(
      "data-first-name",
      "Mia"
    )
  })
})
