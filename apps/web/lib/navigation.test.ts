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
      pickActiveNavItemId(
        flattenNavItems(NAV_GROUPS),
        "/home/clients/anna-smith"
      )
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
    const crumbs = deriveAppCrumbs("/home/sources/imap/primary-inbox", {
      resolveSourceTitle: ({ sourceType, sourceSlug }) =>
        sourceType === "imap" && sourceSlug === "primary-inbox"
          ? "Primary inbox"
          : undefined,
    })

    expect(crumbs.map((crumb) => crumb.label)).toEqual([
      "Home",
      "Data sources",
      "Primary inbox",
    ])
    expect(crumbs[0]?.href).toBe("/home")
    expect(crumbs[1]?.href).toBe("/home/sources")
    expect(crumbs[2]?.href).toBeUndefined()
  })

  it("falls back to slug when source title cannot be resolved", () => {
    expect(
      deriveAppCrumbs("/home/sources/imap/unknown-source").map(
        (crumb) => crumb.label
      )
    ).toEqual(["Home", "Data sources", "unknown-source"])
  })

  it("passes source type and slug to source title resolver", () => {
    const seen: unknown[] = []

    deriveAppCrumbs("/home/sources/forms/shared-slug", {
      resolveSourceTitle: (identity) => {
        seen.push(identity)
        return "Practice intake"
      },
    })

    expect(seen).toEqual([{ sourceType: "forms", sourceSlug: "shared-slug" }])
  })

  it("activates sources nav for nested source detail routes", () => {
    expect(
      pickActiveNavItemId(
        flattenNavItems(NAV_GROUPS),
        "/home/sources/imap/primary-inbox"
      )
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
