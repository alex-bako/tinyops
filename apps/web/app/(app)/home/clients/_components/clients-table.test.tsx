import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

import { ALL_CLIENTS } from "@/features/clients/adapters/mock-client-memory"

import { ClientsTable } from "./clients-table"

const push = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

describe("ClientsTable", () => {
  beforeEach(() => {
    push.mockReset()
    Reflect.deleteProperty(document, "startViewTransition")
  })

  afterEach(() => {
    Reflect.deleteProperty(document, "startViewTransition")
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
    expect(push).not.toHaveBeenCalled()

    fireEvent.click(link.closest("tr")!)
    expect(push).toHaveBeenCalledWith("/home/clients/anna-smith")
  })

  it("uses browser view transition when available", () => {
    const startViewTransition = vi.fn((callback: () => void) => {
      callback()
      return {} as ViewTransition
    })
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    })

    render(
      <ClientsTable
        rows={[ALL_CLIENTS[0]!]}
        emptyMessage="No clients"
        onClear={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText(ALL_CLIENTS[0]!.name).closest("tr")!)

    expect(startViewTransition).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith("/home/clients/anna-smith")
  })
})
