import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ALL_CLIENTS } from "@/features/clients/adapters/mock-client-memory"

import { ClientsPageClient } from "./clients-page-client"

vi.mock("@/features/workspaces/context", () => ({
  useActiveWorkspace: () => ({ id: "ws_1", name: "Bloom Coaching" }),
}))

vi.mock("@/features/clients/adapters/client-profile-realtime-refresh", () => ({
  ClientProfileRealtimeRefresh: () => null,
}))

vi.mock("@/app/(app)/home/actions", () => ({
  searchClientsAction: vi.fn(async () => []),
}))

vi.mock("@/lib/navigation-progress/context", () => ({
  useNavigationProgress: () => ({
    navigate: vi.fn(),
    start: vi.fn(),
    done: vi.fn(),
    isNavigating: false,
  }),
}))

function renderHome(rows = ALL_CLIENTS) {
  return render(
    <ClientsPageClient rows={rows} recentClients={[]} sources={[]} />
  )
}

describe("Home (the client list)", () => {
  it("names the active workspace and its real client count", () => {
    renderHome()

    expect(screen.getByText("Bloom Coaching")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      `All clients. ${ALL_CLIENTS.length} in your practice.`
    )
    expect(
      screen.getByText(`${ALL_CLIENTS.length} of ${ALL_CLIENTS.length} shown`)
    ).toBeInTheDocument()
  })

  it("renders the search bar, the filter tabs and a row per client", () => {
    renderHome()

    expect(
      screen.getByPlaceholderText(/Search clients and sources/i)
    ).toBeInTheDocument()
    expect(screen.getByRole("tablist", { name: /Filter clients/i })).toBeInTheDocument()

    // The table windows its rows, so assert on the first client rather than a count.
    expect(
      screen.getByRole("link", { name: new RegExp(ALL_CLIENTS[0]!.name) })
    ).toBeInTheDocument()
  })

  it("renders none of the deleted example sections", () => {
    renderHome()

    for (const gone of [
      "Jamie",
      "Wednesday, May 8",
      "Needs attention",
      "This week",
      "Recently viewed",
      "Upload a client list",
      "Create a client manually",
      "New monthly check-in",
      "Archive inactive clients",
    ]) {
      expect(screen.queryByText(gone, { exact: false })).not.toBeInTheDocument()
    }
  })

  it("tells an empty workspace it has no clients yet, not that filters failed", () => {
    renderHome([])

    const panel = screen.getByText("No clients yet.").closest("div")!
    expect(within(panel).getByRole("button", { name: /Import/i })).toBeInTheDocument()
    expect(
      within(panel).getByRole("button", { name: /New client/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/No clients match these filters/i)
    ).not.toBeInTheDocument()
  })
})
