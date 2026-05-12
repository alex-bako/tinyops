import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AppShell } from "@/components/app-shell"
import { WorkspaceFeatureProvider } from "@/features/workspaces/context"
import {
  JOINABLE_WORKSPACES,
  WORKSPACES,
  WORKSPACE_USAGE_BY_ID,
} from "@/features/workspaces/mock-data"

let pathname = "/home"

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

function installMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe("AppShell", () => {
  it("renders the resolved session email in the sidebar", () => {
    pathname = "/home"
    installMatchMedia()

    render(
      <WorkspaceFeatureProvider
        data={{
          workspaces: WORKSPACES,
          joinableWorkspaces: JOINABLE_WORKSPACES,
          usageByWorkspaceId: WORKSPACE_USAGE_BY_ID,
        }}
      >
        <AppShell
          userEmail="profile@example.co"
          sourceNavItems={[
            {
              sourceType: "imap",
              sourceSlug: "primary-inbox",
              title: "IMAP mailbox",
            },
          ]}
        >
          <main>Workspace</main>
        </AppShell>
      </WorkspaceFeatureProvider>
    )

    expect(screen.getByText("profile@example.co")).toBeInTheDocument()
  })

  it("resolves source detail breadcrumbs from source nav items", () => {
    pathname = "/home/sources/imap/primary-inbox"
    installMatchMedia()

    render(
      <WorkspaceFeatureProvider
        data={{
          workspaces: WORKSPACES,
          joinableWorkspaces: JOINABLE_WORKSPACES,
          usageByWorkspaceId: WORKSPACE_USAGE_BY_ID,
        }}
      >
        <AppShell
          sourceNavItems={[
            {
              sourceType: "imap",
              sourceSlug: "primary-inbox",
              title: "IMAP mailbox",
            },
          ]}
        >
          <main>Workspace</main>
        </AppShell>
      </WorkspaceFeatureProvider>
    )

    expect(screen.getByText("IMAP mailbox")).toBeInTheDocument()
  })
})
