import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ClientSearchResult } from "@/features/clients/application/client-memory"

import { HomeSearch } from "./home-search"
import type { RecentClientItem } from "./home-search-model"

const searchClientsAction = vi.fn()
const push = vi.fn()

vi.mock("../actions", () => ({
  searchClientsAction: (q: string) => searchClientsAction(q),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const recent: RecentClientItem[] = [
  { slug: "anna-smith", name: "Anna Smith", email: "anna@example.com", status: "active", sources: 3 },
]

function renderSearch() {
  return render(<HomeSearch recentClients={recent} sources={[]} />)
}

function input() {
  return screen.getByPlaceholderText(/Search clients and sources/i)
}

describe("HomeSearch", () => {
  it("opens the panel on focus with quick actions and recents", () => {
    renderSearch()
    expect(screen.queryByText("Quick actions")).not.toBeInTheDocument()

    fireEvent.focus(input())

    expect(screen.getByText("Recently viewed")).toBeInTheDocument()
    expect(screen.getByText("Quick actions")).toBeInTheDocument()
    expect(screen.getByText("View all clients")).toBeInTheDocument()
  })

  it("queries the server as the user types and shows client results", async () => {
    const result: ClientSearchResult = {
      id: "c1",
      slug: "mariko-tan",
      name: "Mariko Tan",
      email: "mariko.t@example.com",
      lastInteractionAt: null,
      sourceCount: 4,
    }
    searchClientsAction.mockResolvedValue([result])

    renderSearch()
    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: "mariko" } })

    await waitFor(() =>
      expect(searchClientsAction).toHaveBeenCalledWith("mariko")
    )
    expect(await screen.findByText("Mariko Tan")).toBeInTheDocument()
  })

  it("navigates to the client profile when a result is chosen", async () => {
    searchClientsAction.mockResolvedValue([
      {
        id: "c1",
        slug: "mariko-tan",
        name: "Mariko Tan",
        email: "mariko.t@example.com",
        lastInteractionAt: null,
        sourceCount: 4,
      } satisfies ClientSearchResult,
    ])

    renderSearch()
    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: "mariko" } })

    const row = await screen.findByText("Mariko Tan")
    fireEvent.click(row)

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/home/clients/mariko-tan")
    )
  })

  it("reports an honest empty state when nothing matches", async () => {
    searchClientsAction.mockResolvedValue([])

    renderSearch()
    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: "zzzz" } })

    expect(
      await screen.findByText(/No clients or sources match/i)
    ).toBeInTheDocument()
  })
})
