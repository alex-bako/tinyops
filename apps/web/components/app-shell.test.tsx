import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AppShell } from "@/components/app-shell"

vi.mock("next/navigation", () => ({
  usePathname: () => "/home",
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
    installMatchMedia()

    render(
      <AppShell userEmail="profile@example.co">
        <main>Workspace</main>
      </AppShell>
    )

    expect(screen.getByText("profile@example.co")).toBeInTheDocument()
  })
})
