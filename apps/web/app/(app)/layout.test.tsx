import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AuthenticatedAppShell } from "@/app/(app)/layout"
import { readSupabaseAppProfileSession } from "@/lib/auth/profile"
import { createServerSupabaseClient } from "@/lib/supabase/server"

vi.mock("@/components/app-shell", () => ({
  AppShell: ({
    children,
    userEmail,
    sourceNavItems,
  }: {
    children: React.ReactNode
    userEmail?: string | null
    sourceNavItems?: { id: string; title: string }[]
  }) =>
    React.createElement(
      "section",
      {
        "data-testid": "app-shell",
        "data-email": userEmail ?? "",
        "data-source-count": sourceNavItems?.length ?? 0,
      },
      children
    ),
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

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}))

describe("AuthenticatedAppShell", () => {
  it("passes the TinyOps profile session email to the shell", async () => {
    const supabase =
      {} as Awaited<ReturnType<typeof createServerSupabaseClient>>
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase)
    vi.mocked(readSupabaseAppProfileSession).mockResolvedValue({
      user: { id: "user_123", email: "auth@example.co" },
      profile: { id: "user_123", email: "profile@example.co" },
      email: "profile@example.co",
    })

    const element = await AuthenticatedAppShell({
      children: React.createElement("span", null, "Workspace"),
    })
    render(element)

    expect(readSupabaseAppProfileSession).toHaveBeenCalledWith(supabase)
    expect(screen.getByTestId("app-shell")).toHaveAttribute(
      "data-email",
      "profile@example.co"
    )
    expect(screen.getByTestId("app-shell")).toHaveAttribute(
      "data-source-count",
      "7"
    )
  })
})
