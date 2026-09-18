import { describe, expect, it, vi } from "vitest"

const redirect = vi.fn()
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }))

import ClientsPage from "./page"

describe("/home/clients", () => {
  it("redirects to Home, which is the client list", () => {
    ClientsPage()
    expect(redirect).toHaveBeenCalledWith("/home")
  })
})
