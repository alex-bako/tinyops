import { describe, expect, it } from "vitest"

import {
  NAV_GROUPS,
  deriveAppCrumbs,
  flattenNavItems,
  pickActiveNavItemId,
} from "./navigation"

describe("navigation model", () => {
  it("marks nested client routes as clients nav", () => {
    expect(
      pickActiveNavItemId(flattenNavItems(NAV_GROUPS), "/home/clients/anna-smith")
    ).toBe("clients")
  })

  it("derives client detail breadcrumbs with injected name lookup", () => {
    const crumbs = deriveAppCrumbs("/home/clients/anna-smith", {
      resolveClientName: (slug) =>
        slug === "anna-smith" ? "Anna Smith" : undefined,
    })

    expect(crumbs.map((crumb) => crumb.label)).toEqual([
      "Home",
      "Clients",
      "Anna Smith",
    ])
  })

  it("falls back to home crumb for unknown routes", () => {
    expect(deriveAppCrumbs("/settings").map((crumb) => crumb.label)).toEqual([
      "Home",
    ])
  })
})
