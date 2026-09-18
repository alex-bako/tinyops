import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ALL_CLIENTS } from "@/features/clients/adapters/mock-client-memory"
import type { ClientListEntry } from "@/features/clients/application/client-memory"

import { ClientsPageClient } from "./clients-page-client"

vi.mock("@/features/workspaces/context", () => ({
  useActiveWorkspace: () => ({ id: "ws_1", name: "Bloom Coaching" }),
}))

vi.mock("@/features/clients/adapters/client-profile-realtime-refresh", () => ({
  ClientProfileRealtimeRefresh: () => null,
}))

vi.mock("@/lib/navigation-progress/context", () => ({
  useNavigationProgress: () => ({
    navigate: vi.fn(),
    start: vi.fn(),
    done: vi.fn(),
    isNavigating: false,
  }),
}))

function renderHome(rows: ClientListEntry[] = ALL_CLIENTS) {
  return render(
    <ClientsPageClient rows={rows} recentClients={[]} sources={[]} />
  )
}

function searchBox() {
  return screen.getByPlaceholderText(/Search clients and sources/i)
}

/** Types one character at a time, the way a person narrows a list. */
function typeIntoSearch(text: string) {
  for (let i = 1; i <= text.length; i++) {
    fireEvent.change(searchBox(), { target: { value: text.slice(0, i) } })
  }
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

    expect(searchBox()).toBeInTheDocument()
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

/* ──────────────────────────────────────────────────────────────────────
 * One search bar, driving the list (M4.T3).
 * ────────────────────────────────────────────────────────────────────── */

function entry(overrides: Partial<ClientListEntry> = {}): ClientListEntry {
  return {
    id: "c1",
    slug: "mariko-tan",
    name: "Mariko Tan",
    email: "mariko.t@example.com",
    cohort: "Imported",
    status: "active",
    sources: 4,
    lastContact: "2 Jun",
    lastEvent: "2 Jun",
    flags: [],
    ...overrides,
  }
}

const ROWS: ClientListEntry[] = [
  entry(),
  entry({ id: "c2", slug: "marion-lee", name: "Marion Lee", email: "marion@example.com" }),
  entry({
    id: "c3",
    slug: "marisol-vega",
    name: "Marisol Vega",
    email: "marisol@example.com",
    status: "inactive",
  }),
  entry({ id: "c4", slug: "tom-becker", name: "Tom Becker", email: "tom@example.com" }),
]

describe("Home search", () => {
  it("renders exactly one search input", () => {
    const { container } = renderHome(ROWS)

    expect(container.querySelectorAll("input")).toHaveLength(1)
    expect(
      screen.queryByLabelText(/Filter by name or email/i)
    ).not.toBeInTheDocument()
  })

  it("narrows the rows and the footer count as the user types", () => {
    renderHome(ROWS)

    expect(screen.getByText("4 of 4 shown")).toBeInTheDocument()

    typeIntoSearch("mari")

    expect(screen.getByText("3 of 4 shown")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Mariko Tan/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Marisol Vega/ })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Tom Becker/ })).not.toBeInTheDocument()

    typeIntoSearch("mariko")

    expect(screen.getByText("1 of 4 shown")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Marion Lee/ })).not.toBeInTheDocument()
  })

  it("offers the same clients in the dropdown as the rows below it", () => {
    renderHome(ROWS)

    fireEvent.focus(searchBox())
    typeIntoSearch("mari")

    const dropdown = screen.getByRole("listbox")
    const offered = within(dropdown)
      .getAllByRole("option")
      .map((o) => o.textContent ?? "")
      .filter((t) => /@example\.com/.test(t))

    expect(offered).toHaveLength(3)
    expect(offered.join(" ")).toContain("Mariko Tan")
    expect(offered.join(" ")).toContain("Marion Lee")
    expect(offered.join(" ")).toContain("Marisol Vega")
    expect(offered.join(" ")).not.toContain("Tom Becker")
  })

  it("composes with the status tabs: text inside Active stays inside Active", () => {
    renderHome(ROWS)

    fireEvent.click(screen.getByRole("tab", { name: /^Active/ }))
    typeIntoSearch("mari")

    expect(screen.getByText("2 of 4 shown")).toBeInTheDocument()
    // Marisol matches the text but is inactive.
    expect(screen.queryByRole("link", { name: /Marisol Vega/ })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Mariko Tan/ })).toBeInTheDocument()
  })

  it("distinguishes a search that matches nothing from an empty workspace", () => {
    renderHome(ROWS)

    typeIntoSearch("zzzzz")

    expect(screen.getByText("0 of 4 shown")).toBeInTheDocument()
    expect(
      screen.getByText("No clients match these filters.")
    ).toBeInTheDocument()
    expect(screen.queryByText("No clients yet.")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Clear filters/i }))

    expect(screen.getByText("4 of 4 shown")).toBeInTheDocument()
    expect(searchBox()).toHaveValue("")
  })
})
