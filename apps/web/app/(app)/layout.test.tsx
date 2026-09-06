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
    clientNavItems,
    sourceNavItems,
  }: {
    children: React.ReactNode
    userEmail?: string | null
    clientNavItems?: { slug: string; name: string }[]
    sourceNavItems?: {
      sourceType: string
      sourceSlug: string
      title: string
    }[]
  }) =>
    React.createElement(
      "section",
      {
        "data-testid": "app-shell",
        "data-email": userEmail ?? "",
        "data-source-count": sourceNavItems?.length ?? 0,
        "data-client-count": clientNavItems?.length ?? 0,
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
    const supabase = clientStoreWithRows([
      {
        id: "client_1",
        workspace_id: WORKSPACES[0]!.id,
        primary_email: "anna@example.com",
        display_name: "Anna",
        slug: "anna",
        status: "active",
        tags: [],
        first_seen_at: "2026-05-10T00:00:00.000Z",
        last_seen_at: "2026-05-10T00:00:00.000Z",
        last_contacted_at: "2026-05-10T00:00:00.000Z",
        do_not_contact: false,
        unsubscribe_status: "subscribed",
        consent_status: "unknown",
        sensitivity_level: 0,
        created_at: "2026-05-10T00:00:00.000Z",
        updated_at: "2026-05-10T00:00:00.000Z",
        timeline_events: [],
      },
    ])
    vi.mocked(createWorkspaceRequestContext).mockResolvedValue({
      supabase: supabase as never,
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
        kind: "data_source",
        icon: "mail",
        title: "IMAP mailbox",
        sub: "hello@example.com",
        category: "Mail",
        auth: "imap",
        connected: true,
        sourceId: "source_1",
        sourceType: "imap",
        sourceSlug: "imap-mailbox",
        health: "healthy",
        lastSync: "ready",
        summaryStatId: "synced",
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
    expect(screen.getByTestId("app-shell")).toHaveAttribute(
      "data-client-count",
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

function clientStoreWithRows(rows: unknown[]) {
  return {
    from(table: string) {
      if (table !== "client_list_rows") {
        throw new Error(`unexpected table: ${table}`)
      }
      return {
        select() {
          return this
        },
        eq() {
          return this
        },
        // The list query ends at `order`, so it resolves rather than chaining.
        async order() {
          return { data: rows, error: null }
        },
      }
    },
  }
}
