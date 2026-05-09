import * as React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AuthenticatedAppShell } from "@/app/(app)/layout"
import { createWorkspaceRequestContext } from "@/features/data-sources/request-context"
import { loadWorkspaceSourceCatalogForWorkspace } from "@/features/data-sources/loaders"
import {
  WORKSPACES,
  WORKSPACE_USAGE_BY_ID,
} from "@/features/workspaces/mock-data"

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => {
    throw new Error("onboarding cookies are not app readiness authority")
  }),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect: ${path}`)
  }),
}))

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

vi.mock("@/features/data-sources/request-context", () => ({
  createWorkspaceRequestContext: vi.fn(),
}))

vi.mock("@/features/data-sources/loaders", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/data-sources/loaders")
  >("@/features/data-sources/loaders")
  return {
    ...actual,
    loadWorkspaceSourceCatalogForWorkspace: vi.fn(),
  }
})

describe("AuthenticatedAppShell", () => {
  beforeEach(() => {
    vi.mocked(createWorkspaceRequestContext).mockReset()
    vi.mocked(loadWorkspaceSourceCatalogForWorkspace).mockReset()
  })

  it("passes profile email and active workspace source nav to the shell", async () => {
    const dataSourceStore = {}
    vi.mocked(createWorkspaceRequestContext).mockResolvedValue({
      supabase: {} as never,
      session: {
        user: { id: "user_123", email: "auth@example.co" },
        profile: {
          id: "user_123",
          email: "profile@example.co",
          firstName: "Jamie",
          lastName: "Park",
          onboardedAt: "2026-05-10T01:02:03.000Z",
        },
        email: "profile@example.co",
      },
      workspaceFeatureData: {
        workspaces: [WORKSPACES[0]!],
        joinableWorkspaces: [],
        usageByWorkspaceId: WORKSPACE_USAGE_BY_ID,
        activeWorkspaceId: "jamie-practice",
      },
      activeWorkspace: WORKSPACES[0]!,
      workspaceStore: {} as never,
      dataSourceStore: dataSourceStore as never,
    })
    vi.mocked(loadWorkspaceSourceCatalogForWorkspace).mockResolvedValue([
      {
        id: "imap",
        icon: "mail",
        title: "IMAP mailbox",
        sub: "hello@example.com",
        category: "Mail",
        auth: "imap",
        connected: true,
        stats: [],
      },
    ])

    const element = await AuthenticatedAppShell({
      children: React.createElement("span", null, "Workspace"),
    })
    render(element)

    expect(loadWorkspaceSourceCatalogForWorkspace).toHaveBeenCalledWith({
      workspace: WORKSPACES[0],
      store: dataSourceStore,
    })
    expect(screen.getByTestId("app-shell")).toHaveAttribute(
      "data-email",
      "profile@example.co"
    )
    expect(screen.getByTestId("app-shell")).toHaveAttribute(
      "data-source-count",
      "1"
    )
  })

  it("redirects to onboarding when the profile is not onboarded", async () => {
    vi.mocked(createWorkspaceRequestContext).mockResolvedValue({
      supabase: {} as never,
      session: {
        user: { id: "user_123", email: "auth@example.co" },
        profile: {
          id: "user_123",
          email: "profile@example.co",
          firstName: "Jamie",
          lastName: "Park",
          onboardedAt: null,
        },
        email: "profile@example.co",
      },
      workspaceFeatureData: {
        workspaces: [WORKSPACES[0]!],
        joinableWorkspaces: [],
        usageByWorkspaceId: WORKSPACE_USAGE_BY_ID,
        activeWorkspaceId: "jamie-practice",
      },
      activeWorkspace: WORKSPACES[0]!,
      workspaceStore: {} as never,
      dataSourceStore: {} as never,
    })

    await expect(
      AuthenticatedAppShell({
        children: React.createElement("span", null, "Workspace"),
      })
    ).rejects.toThrow("redirect: /onboarding")
    expect(loadWorkspaceSourceCatalogForWorkspace).not.toHaveBeenCalled()
  })
})
