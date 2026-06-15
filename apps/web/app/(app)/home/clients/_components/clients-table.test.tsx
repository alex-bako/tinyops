import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { ALL_CLIENTS } from "@/features/clients/adapters/mock-client-memory"

import { ClientsTable } from "./clients-table"

const navigate = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/lib/navigation-progress/context", () => ({
  useNavigationProgress: () => ({
    navigate,
    start: vi.fn(),
    done: vi.fn(),
    isNavigating: false,
  }),
}))

describe("ClientsTable", () => {
  beforeEach(() => {
    navigate.mockReset()
  })

  it("marks newly inserted client rows", () => {
    render(
      <ClientsTable
        rows={[ALL_CLIENTS[0]!]}
        emptyMessage="No clients"
        onClear={vi.fn()}
        newlyInsertedSlugs={new Set([ALL_CLIENTS[0]!.slug])}
      />
    )

    expect(screen.getByText(ALL_CLIENTS[0]!.name).closest("tr")).toHaveAttribute(
      "data-just-inserted"
    )
  })

  it("navigates from row clicks without hijacking link clicks", () => {
    render(
      <ClientsTable
        rows={[ALL_CLIENTS[0]!]}
        emptyMessage="No clients"
        onClear={vi.fn()}
      />
    )

    const link = screen.getByRole("link", { name: /Anna Smith/ })
    fireEvent.click(link)
    expect(navigate).not.toHaveBeenCalled()

    fireEvent.click(link.closest("tr")!)
    expect(navigate).toHaveBeenCalledWith("/home/clients/anna-smith")
  })
})
