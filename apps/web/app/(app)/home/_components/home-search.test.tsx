import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { HomeSearch } from "./home-search"
import type { ClientSearchItem } from "./home-search-model"

const navigate = vi.fn()

vi.mock("@/lib/navigation-progress/context", () => ({
  useNavigationProgress: () => ({
    navigate,
    start: vi.fn(),
    done: vi.fn(),
    isNavigating: false,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const anna: ClientSearchItem = {
  slug: "anna-smith",
  name: "Anna Smith",
  email: "anna@example.com",
  status: "active",
}
const mariko: ClientSearchItem = {
  slug: "mariko-tan",
  name: "Mariko Tan",
  email: "mariko.t@example.com",
  status: "active",
}

function renderSearch({
  query = "",
  clientMatches = [] as ClientSearchItem[],
  onQueryChange = vi.fn(),
} = {}) {
  render(
    <HomeSearch
      query={query}
      onQueryChange={onQueryChange}
      clientMatches={clientMatches}
      recentClients={[anna]}
      sources={[]}
    />
  )
  return { onQueryChange }
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
  })

  it("reports every keystroke upwards instead of holding a query of its own", () => {
    const { onQueryChange } = renderSearch()

    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: "mari" } })

    expect(onQueryChange).toHaveBeenCalledWith("mari")
    // Controlled: the box shows what the caller passed, not what was typed.
    expect(input()).toHaveValue("")
  })

  it("offers the matches it was handed, without querying the server", () => {
    renderSearch({ query: "mari", clientMatches: [mariko] })

    fireEvent.focus(input())

    expect(screen.getByText("Mariko Tan")).toBeInTheDocument()
  })

  it("navigates to the client profile when a match is chosen", async () => {
    renderSearch({ query: "mari", clientMatches: [mariko] })

    fireEvent.focus(input())
    fireEvent.click(screen.getByText("Mariko Tan"))

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/home/clients/mariko-tan")
    )
  })

  it("reports an honest empty state when nothing matches", () => {
    renderSearch({ query: "zzzz", clientMatches: [] })

    fireEvent.focus(input())

    expect(screen.getByText(/No clients or sources match/i)).toBeInTheDocument()
    expect(screen.queryByText("View all clients")).not.toBeInTheDocument()
  })

  it("clears the query through the caller", () => {
    const { onQueryChange } = renderSearch({ query: "mari" })

    fireEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(onQueryChange).toHaveBeenCalledWith("")
  })
})
