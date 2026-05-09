import { describe, expect, it } from "vitest"

import {
  APP_ROUTES,
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

  it("activates sources nav and resolves data sources crumbs", () => {
    expect(
      pickActiveNavItemId(flattenNavItems(NAV_GROUPS), "/home/sources")
    ).toBe("sources")
    expect(
      deriveAppCrumbs("/home/sources").map((crumb) => crumb.label)
    ).toEqual(["Home", "Data sources"])
  })

  it("derives source detail breadcrumbs with injected title lookup", () => {
    const crumbs = deriveAppCrumbs("/home/sources/imap", {
      resolveSourceTitle: (slug) =>
        slug === "imap" ? "IMAP mailbox" : undefined,
    })

    expect(crumbs.map((crumb) => crumb.label)).toEqual([
      "Home",
      "Data sources",
      "IMAP mailbox",
    ])
    expect(crumbs[0]?.href).toBe("/home")
    expect(crumbs[1]?.href).toBe("/home/sources")
    expect(crumbs[2]?.href).toBeUndefined()
  })

  it("falls back to slug when source title cannot be resolved", () => {
    expect(
      deriveAppCrumbs("/home/sources/unknown-source").map(
        (crumb) => crumb.label
      )
    ).toEqual(["Home", "Data sources", "unknown-source"])
  })

  it("activates sources nav for nested source detail routes", () => {
    expect(
      pickActiveNavItemId(flattenNavItems(NAV_GROUPS), "/home/sources/imap")
    ).toBe("sources")
  })

  it("derives route nav and crumbs from the same route metadata", () => {
    const sourceRoute = APP_ROUTES.find((route) => route.id === "sources")!
    const sourceNav = flattenNavItems(NAV_GROUPS).find(
      (item) => item.id === "sources"
    )!

    expect(sourceNav).toMatchObject({
      href: sourceRoute.href,
      label: sourceRoute.label,
    })
    expect(
      deriveAppCrumbs(sourceRoute.href).map((crumb) => crumb.label)
    ).toEqual(["Home", sourceRoute.label])
  })
})
